/**
 * Pipeline data-access layer.
 *
 * Responsibilities (kept out of components, per module rules):
 *  - grouped pipeline fetch (raw leads -> enriched -> grouped)
 *  - service-level TTL caching
 *  - in-flight request deduplication
 *  - pagination
 *  - persisting reschedule / delete actions for optimistic updates
 *
 * The pipeline fetches via its own custom URL builder rather than reusing the
 * shared fetchNewLeads, because the pipeline filters by `cNextContactAt`
 * (action board view) while fetchNewLeads hardcodes `createdAt` (cohort
 * view used by the deals page). Pushing an `attribute` parameter into the
 * shared helper would leak pipeline-specific concerns into every consumer,
 * so the small custom URL builder lives here instead.
 */
import { updateLead, deleteLead } from "services/leads.service";
import {
  buildPipelineDeals,
  groupDealsByCategory,
} from "../utils/pipelineHelpers";
import {
  PIPELINE_CACHE_TTL,
  PIPELINE_PAGE_SIZE,
} from "../utils/pipelineConstants";

const API_BASE = "https://gateway.aajneetiadvertising.com/Lead";

// Date filter types that don't carry a value. The backend understands them
// directly (currentMonth, lastSevenDays, etc.). "on" / "before" / "after"
// carry a single date value; "between" carries two.
const VALUELESS_DATE_TYPES = new Set([
  "today",
  "yesterday",
  "lastSevenDays",
  "currentMonth",
  "lastMonth",
  "currentQuarter",
  "lastQuarter",
  "currentYear",
  "lastYear",
  "past",
  "future",
  "ever",
]);

/**
 * Build the where-clause query string for a single-attribute date filter on
 * `cNextContact`. Mirrors the gateway's `whereGroup` convention.
 *
 * Examples:
 *   "Current Month":
 *     whereGroup[0][type]=currentMonth
 *     &whereGroup[0][attribute]=cNextContact
 *     &whereGroup[0][dateTime]=true
 *
 *   "Specific Day" (on 2026-06-09):
 *     whereGroup[0][type]=on
 *     &whereGroup[0][attribute]=cNextContact
 *     &whereGroup[0][value]=2026-06-09
 *     &whereGroup[0][dateTime]=true
 *
 *   "Date Range":
 *     whereGroup[0][type]=between
 *     &whereGroup[0][attribute]=cNextContact
 *     &whereGroup[0][value][]=2026-05-01
 *     &whereGroup[0][value][]=2026-05-31
 *     &whereGroup[0][dateTime]=true
 *
 * Returns "" for missing / incomplete filters so the caller can omit the
 * clause and the backend returns everything.
 */
const buildDateClause = (dateFilter = {}) => {
  const { dateType, closeDateFrom, closeDateTo } = dateFilter;
  if (!dateType) return "";

  const prefix = "whereGroup[0]";
  const parts = [
    `${prefix}[type]=${dateType}`,
    // Match the backend admin's own filter URL: attribute is `cNextContactAt`
    // (with "At" suffix — the real datetime column) and `[value]=` is always
    // present, even empty for valueless types like currentMonth.
    `${prefix}[attribute]=cNextContactAt`,
    `${prefix}[dateTime]=true`,
  ];

  if (["on", "before", "after"].includes(dateType)) {
    if (!closeDateFrom) return "";
    parts.push(`${prefix}[value]=${encodeURIComponent(closeDateFrom)}`);
  } else if (dateType === "between") {
    if (!closeDateFrom || !closeDateTo) return "";
    parts.push(`${prefix}[value][]=${encodeURIComponent(closeDateFrom)}`);
    parts.push(`${prefix}[value][]=${encodeURIComponent(closeDateTo)}`);
  } else if (VALUELESS_DATE_TYPES.has(dateType)) {
    // Custom datetime columns (like cNextContactAt) 500 at the gateway when
    // `[value]=` is missing — EspoCRM's whereGroup parser expects all four
    // keys (type, attribute, value, dateTime) even for valueless types.
    parts.push(`${prefix}[value]=`);
  } else {
    return "";
  }

  return parts.join("&");
};

const buildPipelineUrl = ({ page, limit, dateFilter }) => {
  const offset = (page - 1) * limit;
  const base = `${API_BASE}?maxSize=${limit}&offset=${offset}&orderBy=createdAt&order=desc`;
  const whereClause = buildDateClause(dateFilter);
  return whereClause ? `${base}&${whereClause}` : base;
};

/**
 * Pipeline-specific network call. Mirrors the auth / 401 handling of the
 * shared leads.service so behaviour stays consistent across modules.
 */
const fetchLeadsForPipeline = async ({ page, limit, dateFilter }) => {
  const token = localStorage.getItem("auth_token");
  const url = buildPipelineUrl({ page, limit, dateFilter });

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", token },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch pipeline leads");
  }

  return await res.json();
};

/**
 * Second, complementary fetch — leads that should land in the Budget Issue
 * column but get hidden by the primary `cNextContact in window` filter
 * because they typically have no follow-up scheduled (a Low Budget lead is
 * one the rep has decided not to actively pursue).
 *
 * Query shape:
 *   (status LIKE %budget%) AND (createdAt in <window>)
 *
 * The status keyword `budget` covers the user-visible cases here ("Low Budget |
 * Low Intent", "Budget Issue", etc.). Other BUDGET_ISSUE_KEYWORDS
 * (payment / document / finance / pricing) are less common as actual status
 * strings — if those start appearing in real data, add more parallel fetches
 * keyed off each keyword.
 */
const fetchBudgetIssueLeads = async ({ page, limit, dateFilter }) => {
  const token = localStorage.getItem("auth_token");
  const offset = (page - 1) * limit;
  const params = [
    `maxSize=${limit}`,
    `offset=${offset}`,
    `orderBy=createdAt`,
    `order=desc`,
    `whereGroup[0][type]=like`,
    `whereGroup[0][attribute]=status`,
    `whereGroup[0][value]=${encodeURIComponent("%budget%")}`,
  ];

  // AND the same date window onto createdAt — keeps the budget pull scoped
  // to the same period the rest of the kanban is showing.
  const { dateType, closeDateFrom, closeDateTo } = dateFilter || {};
  if (dateType) {
    const prefix = "whereGroup[1]";
    let dateOk = true;
    const dateParts = [
      `${prefix}[type]=${dateType}`,
      `${prefix}[attribute]=createdAt`,
      `${prefix}[dateTime]=true`,
    ];
    if (["on", "before", "after"].includes(dateType)) {
      if (!closeDateFrom) dateOk = false;
      else dateParts.push(`${prefix}[value]=${encodeURIComponent(closeDateFrom)}`);
    } else if (dateType === "between") {
      if (!closeDateFrom || !closeDateTo) dateOk = false;
      else {
        dateParts.push(`${prefix}[value][]=${encodeURIComponent(closeDateFrom)}`);
        dateParts.push(`${prefix}[value][]=${encodeURIComponent(closeDateTo)}`);
      }
    } else if (!VALUELESS_DATE_TYPES.has(dateType)) {
      dateOk = false;
    }
    if (dateOk) params.push(...dateParts);
  }

  const url = `${API_BASE}?${params.join("&")}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", token },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch budget issue leads");
  }

  return await res.json();
};

/**
 * Fan-out helper — fetch ALL pages of the primary cNextContactAt-filtered
 * query, not just page 1. The kanban needs every matching lead to produce
 * accurate column counts and a complete drag-and-drop surface; capping at
 * the gateway's 200-per-page limit was silently hiding leads from columns
 * (e.g. 469 leads in the window → only 200 ever reaching the classifier →
 * 269 missing from Overdue / Upcoming / etc.).
 *
 * Strategy: fetch page 1 to discover `total`, then fan out the remaining
 * pages in parallel via Promise.all. For a typical 400-500 lead month this
 * is 2-3 parallel requests on cold load — wall-clock ~1× a single request,
 * not Nx serial. The TTL cache (PIPELINE_CACHE_TTL) then keeps subsequent
 * navigations free.
 */
const fetchAllPrimaryPages = async ({ dateFilter, limit }) => {
  const first = await fetchLeadsForPipeline({ page: 1, limit, dateFilter });
  const total = first?.total ?? first?.list?.length ?? 0;
  const collected = [...(first?.list || [])];

  // Nothing more to fetch — either we got everything in page 1 or there's
  // nothing at all.
  if (collected.length >= total) {
    return { list: collected, total };
  }

  const pagesNeeded = Math.ceil(total / limit);
  const restPromises = [];
  for (let p = 2; p <= pagesNeeded; p++) {
    restPromises.push(fetchLeadsForPipeline({ page: p, limit, dateFilter }));
  }

  const restResponses = await Promise.all(restPromises);
  for (const response of restResponses) {
    if (response?.list?.length) collected.push(...response.list);
  }

  return { list: collected, total };
};

// ---------------------------------------------------------------------------
// Caching + request deduplication
// ---------------------------------------------------------------------------

const responseCache = new Map(); // key -> { data, timestamp }
const inFlightRequests = new Map(); // key -> Promise

const makeKey = ({ limit, dateFilter = {} }) =>
  // Cache key per (limit, dateFilter) — no `page` segment any more because
  // each fetch now loads ALL pages for the window in one orchestrated call.
  // Each date window (currentMonth / lastMonth / etc.) gets its own slot so
  // switching the filter doesn't blow up unrelated cached windows.
  `pipeline:l${limit}:dt${dateFilter.dateType || "currentMonth"}:f${
    dateFilter.closeDateFrom || ""
  }:t${dateFilter.closeDateTo || ""}`;

/** Drop every cached pipeline page (call after a mutation succeeds). */
export const invalidatePipelineCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
};

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch ALL pipeline leads for the given date window (no pagination caller-
 * side). The kanban needs a complete picture for accurate column counts and
 * a coherent drag-and-drop surface.
 *
 *  - Primary pages (cNextContactAt in window) are fan-out fetched by
 *    `fetchAllPrimaryPages` after page 1 reveals `total`.
 *  - Budget-issue companion (status LIKE %budget% AND createdAt in window)
 *    runs in parallel; single page because budget-lead count rarely exceeds
 *    the page limit. Add a similar fan-out if that ever changes.
 *  - Merged + de-duped by id; classifier then buckets each unique lead.
 *  - Cached per (limit, dateFilter) with `PIPELINE_CACHE_TTL`; in-flight
 *    map de-dupes concurrent identical requests.
 */
export const fetchPipelineLeads = async ({
  limit = PIPELINE_PAGE_SIZE,
  dateFilter = { dateType: "currentMonth" },
  force = false,
} = {}) => {
  const key = makeKey({ limit, dateFilter });

  const cached = responseCache.get(key);
  if (!force && cached && Date.now() - cached.timestamp < PIPELINE_CACHE_TTL) {
    return cached.data;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const request = (async () => {
    const normalizedDateFilter = {
      dateType: dateFilter.dateType || "currentMonth",
      closeDateFrom: dateFilter.closeDateFrom || "",
      closeDateTo: dateFilter.closeDateTo || "",
    };
    const [primaryAll, budgetResponse] = await Promise.all([
      fetchAllPrimaryPages({
        dateFilter: normalizedDateFilter,
        limit,
      }),
      fetchBudgetIssueLeads({
        page: 1,
        limit,
        dateFilter: normalizedDateFilter,
      }),
    ]);

    const seen = new Set();
    const list = [];
    for (const lead of [
      ...(primaryAll?.list || []),
      ...(budgetResponse?.list || []),
    ]) {
      if (lead?.id && !seen.has(lead.id)) {
        seen.add(lead.id);
        list.push(lead);
      }
    }
    // Total = unique leads actually served. (Previously this was the sum of
    // both responses' totals, which double-counted overlap between the
    // primary and budget queries.)
    const total = list.length;
    const data = {
      list,
      total,
      limit,
      // Everything for this window is loaded; nothing left to paginate.
      hasMore: false,
    };
    responseCache.set(key, { data, timestamp: Date.now() });
    return data;
  })().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request);
  return request;
};

/**
 * Grouped pipeline fetch: raw leads -> normalized + classified deals,
 * already bucketed into the kanban columns.
 */
export const getGroupedPipeline = async (params) => {
  const { list, total, hasMore } = await fetchPipelineLeads(params);
  const deals = buildPipelineDeals(list);
  return {
    deals,
    grouped: groupDealsByCategory(deals),
    total,
    hasMore,
  };
};

// ---------------------------------------------------------------------------
// Mutations (persist the optimistic UI changes to EspoCRM)
// ---------------------------------------------------------------------------

/**
 * Persist a follow-up reschedule. `nextContactDate` is an EspoCRM date-time
 * string. The cache is invalidated so the next read reflects the change.
 */
export const persistDealReschedule = async (id, nextContactDate) => {
  const result = await updateLead(id, {
    cNextContactAt: nextContactDate,
    cNextContact: nextContactDate,
  });
  invalidatePipelineCache();
  return result;
};

/** Persist a delete and invalidate the pipeline cache. */
export const deletePipelineDeal = async (id) => {
  const result = await deleteLead(id);
  invalidatePipelineCache();
  return result;
};
