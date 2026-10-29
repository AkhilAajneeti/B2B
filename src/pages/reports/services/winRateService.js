import { handleUnauthorized } from "services/session";
/**
 * Win Rate analytics data layer.
 *
 * Pattern: ONE backend fetch per (filters × year), paginated up to MAX_LEADS.
 * Frontend groups the records by month + Win / Active / Lost category.
 *
 * Cache:
 *   - In-flight dedup (Map of Promise) so concurrent observers share a request.
 *   - localStorage persistence so the chart paints instantly on reload.
 *   - 10-min TTL on cached entries; React Query handles 5-min background refresh.
 */

const ESPO_BASE = "https://gateway.aajneetiadvertising.com/Lead";

// v3: the select gained modifiedAt (v2 added cStatusObj + cProject). The key
// MUST move with the select — see the note beside it.
const DATASET_KEY_PREFIX = "win_rate_dataset_v3";
const DATASET_TTL = 1000 * 60 * 10;
const DATASET_GC = 1000 * 60 * 60 * 24;

const PAGE_SIZE = 200;
// Higher than the deals analytics cap because a yearly window can hold more leads.
const MAX_LEADS = 5000;

const DATE_FILTER_TYPES = new Set([
  "today",
  "yesterday",
  "currentMonth",
  "lastMonth",
  "nextMonth",
  "currentQuarter",
  "lastQuarter",
  "currentYear",
  "lastYear",
  "lastSevenDays",
  "lastXDays",
  "between",
  "before",
  "after",
  "on",
  "past",
  "future",
  "ever",
  "isEmpty",
]);

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

const buildQuery = (whereGroup) =>
  whereGroup
    .map((f, i) => {
      // Nested OR group — `{ type: "or", value: [ {type,attribute,value}, … ] }`
      // serialised as whereGroup[i][value][j][…], the same shape
      // services/leads.service.js uses and the gateway already accepts.
      //
      // Without this branch each sub-clause falls into the Array.isArray path
      // below and is encodeURIComponent'd whole, producing
      // `whereGroup[0][value][]=%5Bobject%20Object%5D` — which the gateway
      // answers with a 500, not a validation message.
      if (f.type === "or" && Array.isArray(f.value)) {
        let q = `whereGroup[${i}][type]=or`;
        f.value.forEach((sub, j) => {
          q += `&whereGroup[${i}][value][${j}][type]=${encodeURIComponent(sub.type)}`;
          if (sub.attribute) {
            q += `&whereGroup[${i}][value][${j}][attribute]=${encodeURIComponent(sub.attribute)}`;
          }
          if (sub.value !== undefined && sub.value !== null && sub.value !== "") {
            q += `&whereGroup[${i}][value][${j}][value]=${encodeURIComponent(sub.value)}`;
          }
        });
        return q;
      }

      let q = `whereGroup[${i}][type]=${encodeURIComponent(f.type)}`;
      if (f.attribute) {
        q += `&whereGroup[${i}][attribute]=${encodeURIComponent(f.attribute)}`;
      }
      if (Array.isArray(f.value)) {
        f.value.forEach((v) => {
          q += `&whereGroup[${i}][value][]=${encodeURIComponent(v)}`;
        });
      } else if (f.value !== undefined && f.value !== null && f.value !== "") {
        q += `&whereGroup[${i}][value]=${encodeURIComponent(f.value)}`;
      }
      if (f.dateTime || DATE_FILTER_TYPES.has(f.type)) {
        q += `&whereGroup[${i}][dateTime]=true`;
      }
      return q;
    })
    .join("&");

// Mirrors the page-level filters object from reports/index.jsx into ESPO where clauses.
// Drops `status` (we want all statuses for categorisation) and `createdAt` (chart picks the year).
const filtersToWhereGroup = (filters = {}) => {
  const where = [];

  if (filters.search) {
    where.push({ type: "like", attribute: "name", value: `%${filters.search}%` });
  }
  if (filters.source) {
    where.push({ type: "equals", attribute: "source", value: filters.source });
  }
  if (filters.assignUser) {
    where.push({
      type: "equals",
      attribute: "assignedUserId",
      value: filters.assignUser,
    });
  }
  // TEAM FILTER — `_teamUserIds` is the internal, derived field set by the
  // Reports page from the selected team's members (Lead has no native team
  // attribute). Translates to `assignedUserId IN [...]`, mirroring
  // leads.service.js and useFilteredMetrics so the charts, the cards and the
  // table all scope to the same team. An empty array means the team has no
  // users → match nothing, rather than silently charting everyone.
  if (Array.isArray(filters._teamUserIds)) {
    if (filters._teamUserIds.length === 0) {
      where.push({
        type: "equals",
        attribute: "id",
        value: "__no_team_users__",
      });
    } else {
      where.push({
        type: "in",
        attribute: "assignedUserId",
        value: filters._teamUserIds,
      });
    }
  }
  /**
   * Project filter.
   *
   * `_projectTokens` is what a project PICKER sends: the project's nomen and
   * its full name, OR'd across every lead field that can hold the label.
   *
   * A single `like %name%` on cProject alone is not enough, and failed exactly
   * this way: the picker's value is the project's full `name`
   * ("ShubhamShakyaPropshopMigsunRohiniCentral") while leads carry the short
   * NOMEN ("MigsunRohiniCentral"), so the search looked for the long string
   * inside a field holding the short one and matched nothing. An empty result
   * here is indistinguishable from "no leads in this period", which is why it
   * read as a broken report rather than a broken filter.
   *
   * Leads also spread the label across cProject / cProjectName / cProjectNomen
   * inconsistently — see campaigns/utils/leadScope, which solves the same
   * problem for the campaign queries with the same shape of condition.
   *
   * `equals` rather than `like`: exact matching costs nothing in recall once
   * both tokens are covered, and it stops "MigsunRohini" dragging in
   * "MigsunRohiniCentral".
   */
  const projectTokens = (filters._projectTokens || []).filter(Boolean);
  if (projectTokens.length) {
    where.push({
      type: "or",
      value: projectTokens.flatMap((token) =>
        ["cProject", "cProjectName", "cProjectNomen"].map((attribute) => ({
          type: "equals",
          attribute,
          value: token,
        })),
      ),
    });
  } else if (filters.cProject) {
    // Free-text fallback, for any caller still typing a partial name.
    where.push({
      type: "like",
      attribute: "cProject",
      value: `%${filters.cProject}%`,
    });
  }
  if (filters.sector) {
    where.push({ type: "equals", attribute: "cSector", value: filters.sector });
  }

  return where;
};

const dateFilterToWhere = (filters = {}, year) => {
  if (filters.dateFilter === "on" && filters.date) {
    return {
      type: "on",
      attribute: "createdAt",
      value: filters.date,
      dateTime: true,
    };
  }

  if (filters.dateFilter === "between" && filters.startDate && filters.endDate) {
    return {
      type: "between",
      attribute: "createdAt",
      value: [filters.startDate, filters.endDate],
      dateTime: true,
    };
  }

  return {
    type: "between",
    attribute: "createdAt",
    value: [`${year}-01-01 00:00:00`, `${year}-12-31 23:59:59`],
    dateTime: true,
  };
};

// ---------------------------------------------------------------------------
// localStorage cache (per filters + year)
// ---------------------------------------------------------------------------

const stableFiltersKey = (filters = {}) => {
  const keys = Object.keys(filters).sort();
  return JSON.stringify(keys.map((k) => [k, filters[k]]));
};

const cacheKeyFor = (filters, year) =>
  `${DATASET_KEY_PREFIX}:${year}:${stableFiltersKey(filters)}`;

export const readCachedDataset = (filters, year) => {
  try {
    const key = cacheKeyFor(filters, year);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp) return null;
    if (Date.now() - parsed.timestamp > DATASET_GC) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// How many filter/year datasets to keep at once.
//
// This is the biggest thing the app puts in localStorage BY FAR: one entry per
// (filters x year), each holding up to MAX_LEADS records — roughly a megabyte
// apiece. Nothing used to remove them. readCachedDataset only drops an entry
// when something reads it and finds it stale, so a dataset for a filter
// combination nobody revisits stayed forever, and a few afternoons of changing
// filters on Reports was enough to fill the ~5MB origin quota.
//
// The write itself was already in a try/catch, so it failed silently — but a
// full quota is shared, and it was breaking OTHER writes that were not
// guarded, including the session written at login. Three is enough for the
// pattern people actually use (current filters, plus flipping back and forth).
const MAX_DATASETS = 3;

/** Remove expired datasets, then the oldest, until only MAX_DATASETS remain. */
const pruneDatasets = (keepKey) => {
  try {
    const now = Date.now();
    const entries = [];

    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith(DATASET_KEY_PREFIX) || k === keepKey) return;
      let ts = 0;
      try {
        ts = JSON.parse(localStorage.getItem(k))?.timestamp || 0;
      } catch {
        ts = 0; // unparseable entry — treat as oldest so it is dropped first
      }
      if (!ts || now - ts > DATASET_GC) {
        localStorage.removeItem(k);
      } else {
        entries.push([k, ts]);
      }
    });

    entries.sort((a, b) => b[1] - a[1]);
    entries.slice(MAX_DATASETS - 1).forEach(([k]) => localStorage.removeItem(k));
  } catch {
    /* storage disabled — nothing to prune */
  }
};

export const writeCachedDataset = (filters, year, list) => {
  const key = cacheKeyFor(filters, year);
  const payload = JSON.stringify({ list, timestamp: Date.now() });

  // Prune BEFORE writing, so the new entry has room rather than being the one
  // that gets rejected.
  pruneDatasets(key);

  try {
    localStorage.setItem(key, payload);
  } catch {
    // Still no room. Drop every other dataset and try once more; a cache miss
    // is cheap, a quota that stays full breaks unrelated writes.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(DATASET_KEY_PREFIX) && k !== key)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, payload);
    } catch {
      /* give up: the dataset simply will not be cached this time */
    }
  }
};

export const isCachedDatasetFresh = (filters, year) => {
  const cached = readCachedDataset(filters, year);
  if (!cached) return false;
  return Date.now() - cached.timestamp < DATASET_TTL;
};

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

const inFlight = new Map();

export const fetchWinRateDataset = async ({ filters = {}, year }) => {
  const key = cacheKeyFor(filters, year);
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = (async () => {
    const token = localStorage.getItem("auth_token");

    const baseWhere = filtersToWhereGroup(filters);
    const whereGroup = [
      ...baseWhere,
      dateFilterToWhere(filters, year),
    ];

    const query = buildQuery(whereGroup);
    // Keep in sync with what the aggregation hooks read: useWinRateAnalytics
    // needs status/createdAt; useFunnelAnalytics additionally groups by
    // assignedUserId/assignedUserName for its per-rep breakdown; Team
    // Performance adds cStatusObj (the statuses a lead has passed through,
    // which is what makes Ever-Qualified computable without a backend change)
    // and cProject (so its qualification index can compare reps on the same
    // project mix).
    //
    // Both are additive — existing consumers ignore them — but the cache key
    // below HAD to be bumped alongside this. A localStorage entry written
    // before these fields existed deserialises fine and simply has no
    // cStatusObj, which would make every lead read as never-qualified: a
    // plausible-looking wrong number rather than an error.
    const select = [
      "id",
      "status",
      "createdAt",
      "assignedUserId",
      "assignedUserName",
      "cStatusObj",
      "cProject",
      // modifiedAt powers the suspect-qualification guard: a lead qualified and
      // reversed within a couple of hours was never really qualified.
      "modifiedAt",
    ].join(",");

    const fetchPage = async (offset) => {
      const url = `${ESPO_BASE}?${query}&select=${select}&maxSize=${PAGE_SIZE}&offset=${offset}&orderBy=createdAt&order=desc`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", token },
      });

      if (!res.ok) {
        if (res.status === 401) {
      handleUnauthorized();
    }
        throw new Error(`Win rate fetch failed: ${res.status}`);
      }

      return res.json();
    };

    // Page 0 first — its `total` tells us exactly how many more pages exist, so
    // the rest can be fetched CONCURRENTLY. The previous implementation awaited
    // each page in sequence (up to 25 round trips back-to-back), which is what
    // made the analytics panel take ~10s to paint. The browser still caps
    // concurrent requests per host, so this self-throttles rather than
    // stampeding the gateway.
    const first = await fetchPage(0);
    const firstList = first?.list || [];
    const all = [...firstList];

    const reportedTotal =
      typeof first?.total === "number" ? first.total : firstList.length;
    const total = Math.min(reportedTotal, MAX_LEADS);

    if (firstList.length === PAGE_SIZE && total > PAGE_SIZE) {
      const offsets = [];
      for (let o = PAGE_SIZE; o < total; o += PAGE_SIZE) offsets.push(o);

      // BATCHED, not all-at-once and not one-at-a-time.
      //
      // At the 5,000-lead cap this is 24 page requests. Firing them together
      // (the previous behaviour) saturates the browser's ~6 connections per
      // host, so every other request the page needs — counts, teams, the lead
      // list — waits behind them. Awaiting them one by one, which is what this
      // replaced, was 24 sequential round trips and took ~10s to paint.
      //
      // Five at a time keeps the pipe busy while leaving room for the rest of
      // the page, matching the batching already used by the dashboard charts.
      const PAGE_BATCH = 5;
      for (let i = 0; i < offsets.length; i += PAGE_BATCH) {
        const batch = await Promise.all(
          offsets.slice(i, i + PAGE_BATCH).map((o) => fetchPage(o)),
        );
        for (const page of batch) all.push(...(page?.list || []));
      }
    }

    // Guard against the backend reporting a larger `total` than it pages out.
    const capped = all.slice(0, MAX_LEADS);
    writeCachedDataset(filters, year, capped);
    return capped;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, promise);
  return promise;
};

export const invalidateWinRateCache = () => {
  inFlight.clear();
  // Best-effort wipe of all our localStorage entries.
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(DATASET_KEY_PREFIX)) localStorage.removeItem(k);
    });
  } catch {
    // ignore
  }
};
