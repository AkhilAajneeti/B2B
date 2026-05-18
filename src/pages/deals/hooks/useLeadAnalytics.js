/**
 * Lead Analytics hooks.
 *
 * Strategy: ONE shared dataset fetch per (filters × range), driven by ESPO
 * `whereGroup` filters. Frontend groups the records for the chart — that's a
 * tight O(N) reduce, not the "filter the paginated table" pattern we avoid.
 *
 * Cache:
 *   - localStorage gives instant render on reload (`initialData`).
 *   - `initialDataUpdatedAt: 0` marks cached data as stale, triggering a
 *     background refetch so the user never sees out-of-date numbers.
 *   - `staleTime` keeps the in-memory cache fresh for 2 min after a real fetch
 *     so chart re-mounts within that window don't re-hit the network.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLeadsForAnalytics,
  readCachedDataset,
  BUSINESS_STATUSES,
} from "../services/analyticsService";

const FRESH_WINDOW = 1000 * 60 * 2; // 2 min — chart re-mounts within this skip network
const KEEP_IN_MEMORY = 1000 * 60 * 30;

const firstName = (full) => (full || "").trim().split(" ")[0] || "Unassigned";

const isOverdue = (lead, now) => {
  if (lead?.status !== "Follow up") return false;
  if (!lead?.cNextContact) return false;
  const d = new Date(lead.cNextContact);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now;
};

// ---------------------------------------------------------------------------
// Primary dataset hook — both charts (current + future StatusChart) share it.
// ---------------------------------------------------------------------------

export const useLeadsForAnalytics = ({
  filters,
  range = "7d",
  onDate = null,
  enabled = true,
}) => {
  // When picking a single day, don't fire the request until a date is chosen.
  const ready = range !== "on" || !!onDate;

  return useQuery({
    queryKey: ["lead-analytics-dataset", filters, range, range === "on" ? onDate : null],
    queryFn: () => fetchLeadsForAnalytics({ filters, range, onDate }),
    enabled: enabled && ready,
    initialData: () => {
      const cached = readCachedDataset(filters, range, onDate);
      return cached?.list ?? undefined;
    },
    // 0 = treat initialData as immediately stale -> RQ fires a background refetch.
    initialDataUpdatedAt: 0,
    staleTime: FRESH_WINDOW,
    gcTime: KEEP_IN_MEMORY,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};

// ---------------------------------------------------------------------------
// Per-user breakdown derived from the shared dataset.
// ---------------------------------------------------------------------------

export const useUserBreakdown = ({
  filters,
  range = "7d",
  onDate = null,
  enabled = true,
}) => {
  const { data: list, isLoading, isFetching, isError } = useLeadsForAnalytics({
    filters,
    range,
    onDate,
    enabled,
  });

  const data = useMemo(() => {
    const records = list || [];
    const now = Date.now();
    const byUser = new Map();

    for (const lead of records) {
      const uid = lead?.assignedUserId || "unassigned";
      let row = byUser.get(uid);
      if (!row) {
        row = {
          userId: uid,
          name: firstName(lead?.assignedUserName),
          fullName: lead?.assignedUserName || "Unassigned",
          interested: 0,
          followUp: 0,
          purchased: 0,
          notInterested: 0,
          newOpen: 0,
          other: 0,
          
          otherBreakdown: {},
          total: 0,
          overdue: 0,
        };
        byUser.set(uid, row);
      }

      // Every lead counts toward the user's total — including technical statuses.
      // That keeps the bar total honest ("Anish made 31 this week" → 31).
      switch (lead?.status) {
        case "Interested":
          row.interested += 1;
          break;
        case "Follow up":
          row.followUp += 1;
          break;
        case "Purchased":
          row.purchased += 1;
          break;
        case "Not Interested":
          row.notInterested += 1;
          break;
        case "New":
        case "Open":
          row.newOpen += 1;
          break;
        default: {
          row.other += 1;
          const key = lead?.status || "Unknown";
          row.otherBreakdown[key] = (row.otherBreakdown[key] || 0) + 1;
          break;
        }
      }

      row.total += 1;
      if (isOverdue(lead, now)) row.overdue += 1;
    }

    return [...byUser.values()];
  }, [list]);

  return { data, isLoading, isFetching, isError };
};

export { BUSINESS_STATUSES };

// Status -> safe object-key mapping. Re-exported for StatusChart (currently
// disabled; will consume the same dataset when re-enabled).
export const STATUS_KEY = {
  "New": "New",
  "Interested": "Interested",
  "Follow up": "FollowUp",
  "Purchased": "Purchased",
  "Not Interested": "NotInterested",
};

// Stub kept so the (currently commented-out) StatusChart import resolves.
// TODO: re-implement on top of useLeadsForAnalytics when StatusChart is re-enabled.
export const useStatusTrend = () => ({
  data: [],
  isLoading: false,
  isFetching: false,
  isError: false,
});
