/**
 * Filter-aware metrics for the Reports page top cards.
 *
 * Each card is backed by a dedicated ESPO count query so the displayed number
 * reflects the FULL filtered dataset, not the paginated table response.
 *
 * The query includes:
 *   - base filters (date, source, assigned user, search)
 *   - the card's own status
 *
 * The cards deliberately DO NOT inherit the page-level status filter: each card
 * *is* a status, so a status filter is theirs to own. Selecting a card (which
 * sets the page status to drive the table) must not zero out the sibling cards.
 * The cards stay a stable at-a-glance breakdown; only the table below filters.
 *
 * Caching: React Query keeps results for 2 min and silently refetches when stale.
 * `fetchLeadsCount` has its own 10-min in-memory + localStorage cache underneath
 * so identical queries across sessions hit cache, not network.
 */
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchLeadsCount } from "services/leads.service";

// Card definitions — single source of truth for what each tile means.
// Each status gets a distinct hue + a two-stop "burst" gradient for the icon
// tile (matching the dashboard funnel's treatment). Four separate hues —
// green / amber / violet / rose — so the four cards never read as similar.
// (Call Not Picked moved red→amber: a missed call is "retry", not "dead", and
// it keeps it distinct from the red Not Interested card.)
export const METRIC_DEFS = [
  {
    title: "Not Interested",
    // RAW stored value — lower-case "interested". The dropdown label is title
    // case; querying the label returns a count of 0 rather than an error.
    status: "Not interested",
    icon: "XCircle",
    from: "#F43F5E",
    to: "#E11D48",
    description: "Leads marked as not interested",
  },
  {
    title: "Call Not Picked",
    status: "Call Not Picked",
    icon: "PhoneOff",
    from: "#F59E0B",
    to: "#F97316",
    description: "Leads not reachable on call",
  },
  {
    title: "Call Later",
    status: "Call Later",
    icon: "Clock",
    from: "#8B5CF6",
    to: "#7C3AED",
    description: "Leads scheduled for future follow-up",
  },
];

/* ---------------------------------------------------------------------------
 * Qualification cards (admin only)
 *
 * The four cards above each count ONE current status. These answer the
 * different question of where leads ended up: how many are qualified right now,
 * how many qualified only because of delay, and how many qualified at some
 * point and have since moved off it.
 *
 * Status values here are the RAW stored strings, which are not always the
 * dropdown labels — the stored value is "Not interested" with a lower-case i,
 * and the Not Interested card above relies on that exact spelling. Getting one
 * wrong does not raise an error: EspoCRM returns a count of 0 and the card
 * reads as "none", which is indistinguishable from a true zero.
 *
 * That is why "Dropped after qualified" is expressed as notIn(qualifying)
 * rather than in(negative statuses). Defining it by what it is NOT means the
 * only strings that have to be right are the qualifying ones — the same values
 * the working status filter already sends — instead of the ten or so negative
 * labels, every one of which would be a silent-zero risk.
 * ------------------------------------------------------------------------- */

// Qualifying statuses, excluding QDTD so the two cards never double-count the
// same lead. Exported because the Genuinely Qualified card expands into a
// per-status breakdown built from this exact list — the breakdown has to sum to
// the card, so both must read one definition.
export const QUALIFYING_STATUSES = [
  "Follow up",
  "Interested",
  "Site Visit Scheduled",
  "Invitation Sent",
  "Site Visit Done",
  "Purchased",
];

// Stored as the code; "Qualify Due To Delay" is only the label.
const QDTD_STATUS = "QDTD";

const ALL_QUALIFYING = [...QUALIFYING_STATUSES, QDTD_STATUS];

export const QUALIFICATION_DEFS = [
  {
    title: "Total Leads",
    icon: "Users",
    from: "#3B82F6",
    to: "#2563EB",
    description: "Every lead in the current filter",
    clauses: [],
  },
  {
    title: "Genuinely Qualified",
    icon: "BadgeCheck",
    from: "#14B8A6",
    to: "#0D9488",
    description: "Sitting in a qualifying status right now",
    clauses: [{ type: "in", attribute: "status", value: QUALIFYING_STATUSES }],
  },
  {
    title: "Qualified Due To Delay",
    icon: "Hourglass",
    from: "#6366F1",
    to: "#4338CA",
    description: "Qualified only because of delay (QDTD)",
    clauses: [{ type: "equals", attribute: "status", value: QDTD_STATUS }],
  },
  {
    title: "Dropped After Qualified",
    icon: "TrendingDown",
    from: "#78716C",
    to: "#57534E",
    description: "Was qualified once, has since moved off it",
    clauses: [
      // Ever held a qualifying status. arrayAnyOf is EspoCRM's operator for
      // array attributes and is the same one the "Previously in status" filter
      // uses, so it is proven against this backend.
      { type: "arrayAnyOf", attribute: "cStatusObj", value: ALL_QUALIFYING },
      // ...and is not in one now.
      { type: "notIn", attribute: "status", value: ALL_QUALIFYING },
    ],
  },
];

// Page-level filter object -> ESPO whereGroup array.
// Mirrors fetchNewLeads' mapping, EXCEPT we leave the status filter for the
// caller to add — each card injects its own status on top.
const buildBaseWhere = (filters = {}) => {
  const where = [];

  if (filters.dateType) {
    const t = filters.dateType;
    if (
      [
        "today",
        "lastSevenDays",
        "currentMonth",
        "lastMonth",
        "nextMonth",
        "currentQuarter",
        "lastQuarter",
        "currentYear",
        "lastYear",
        "past",
        "future",
        "ever",
        "isEmpty",
      ].includes(t)
    ) {
      where.push({ type: t, attribute: "createdAt", dateTime: true });
    } else if (["on", "before", "after"].includes(t) && filters.closeDateFrom) {
      where.push({
        type: t,
        attribute: "createdAt",
        value: filters.closeDateFrom,
        dateTime: true,
      });
    } else if (
      t === "between" &&
      filters.closeDateFrom &&
      filters.closeDateTo
    ) {
      where.push({
        type: "between",
        attribute: "createdAt",
        value: [filters.closeDateFrom, filters.closeDateTo],
        dateTime: true,
      });
    } else if (["lastXDays", "afterXDays"].includes(t) && filters.xDays) {
      where.push({ type: t, value: filters.xDays });
    }
  }

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
  // leads.service.js so the cards and the table agree. An empty array means the
  // team has no users → match nothing, rather than silently matching everything.
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

  return where;
};

export const useFilteredMetrics = ({
  filters,
  enabled = true,
  // Admin-only extra row. Off by default so the four status cards stay exactly
  // as they are for every other role, and so the extra count queries are not
  // fired for users who will never see them.
  includeQualification = false,
  // Per-status breakdown behind the Genuinely Qualified card. Off until the
  // card is actually opened, so six extra count queries are not fired for a
  // panel nobody has looked at.
  includeQualifyingBreakdown = false,
}) => {
  const baseWhere = useMemo(() => buildBaseWhere(filters), [filters]);

  const queries = useMemo(() => {
    return METRIC_DEFS.map((m) => {
      // Compose the card's where clause: base filters + the card's OWN status.
      // The page-level status filter is intentionally excluded so selecting one
      // card doesn't zero out the others.
      const where = [...baseWhere];
      where.push({ type: "equals", attribute: "status", value: m.status });

      return {
        queryKey: ["filtered-metric", m.title, where],
        queryFn: () => fetchLeadsCount(where),
        enabled,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // Keep showing the last value while a new fetch is in flight,
        // so filter changes don't briefly blank the cards.
        placeholderData: (prev) => prev,
        retry: 1,
      };
    });
  }, [baseWhere, enabled]);

  const results = useQueries({ queries });

  const qualificationQueries = useMemo(() => {
    if (!includeQualification) return [];
    return QUALIFICATION_DEFS.map((m) => {
      const where = [...baseWhere, ...m.clauses];
      return {
        queryKey: ["qualification-metric", m.title, where],
        queryFn: () => fetchLeadsCount(where),
        enabled,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
        retry: 1,
      };
    });
  }, [baseWhere, enabled, includeQualification]);

  const qualificationResults = useQueries({ queries: qualificationQueries });

  const breakdownQueries = useMemo(() => {
    if (!includeQualification || !includeQualifyingBreakdown) return [];
    return QUALIFYING_STATUSES.map((status) => {
      // Base filters + this one status — the same shape the parent card uses
      // with `in`, so the parts add up to the whole.
      const where = [...baseWhere, { type: "equals", attribute: "status", value: status }];
      return {
        queryKey: ["qualifying-breakdown", status, where],
        queryFn: () => fetchLeadsCount(where),
        enabled,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: (prev) => prev,
        retry: 1,
      };
    });
  }, [baseWhere, enabled, includeQualification, includeQualifyingBreakdown]);

  const breakdownResults = useQueries({ queries: breakdownQueries });

  const metricsData = useMemo(() => {
    return METRIC_DEFS.map((m, i) => ({
      title: m.title,
      status: m.status, // used by the Reports page to filter the table on click
      value: results[i]?.data ?? 0,
      change: "—",
      changeType: "positive",
      icon: m.icon,
      from: m.from,
      to: m.to,
      description: m.description,
    }));
  }, [results]);

  const qualificationData = useMemo(() => {
    if (!includeQualification) return [];
    return QUALIFICATION_DEFS.map((m, i) => ({
      title: m.title,
      value: qualificationResults[i]?.data ?? 0,
      icon: m.icon,
      from: m.from,
      to: m.to,
      description: m.description,
    }));
  }, [qualificationResults, includeQualification]);

  const qualifyingBreakdown = useMemo(() => {
    if (!includeQualifyingBreakdown) return [];
    return QUALIFYING_STATUSES.map((status, i) => ({
      status,
      value: breakdownResults[i]?.data ?? 0,
    }));
  }, [breakdownResults, includeQualifyingBreakdown]);

  const breakdownLoading = breakdownResults.some((r) => r.isLoading);

  return {
    metricsData,
    qualificationData,
    qualifyingBreakdown,
    breakdownLoading,
    isLoading: results.some((r) => r.isLoading),
    isFetching: results.some((r) => r.isFetching),
  };
};
