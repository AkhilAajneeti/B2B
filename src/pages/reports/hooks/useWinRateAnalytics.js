/**
 * Win Rate analytics hook.
 *
 * COUNTED BY THE SERVER, one small query per (month × category). It used to
 * pull up to 5,000 lead RECORDS newest-first and group them here, which meant
 * that past the cap the oldest months were never fetched at all: the chart
 * drew twelve months with data in only the most recent few weeks, and looked
 * like an empty year rather than a truncated one. See
 * fetchMonthlyWinRateCounts for the full reasoning, including why every
 * category now buckets by createdAt.
 *
 * Shape is unchanged for callers:
 *   - monthlyData: 12 rows (Jan–Dec) with { month, won, lost, active, total, winRate }
 *   - pieData:     [{ name: "Won", value, fill }, { name: "Active", … }, { name: "Lost", … }]
 *   - summary:     { totalWon, totalLost, totalActive, overallWinRate, bestMonth, trends }
 *   - isEmpty:     true when every monthly bucket is zero (drives "no data" state)
 *
 * React Query handles in-memory caching and silent background refresh. The
 * underlying counts come through services/leads.service's fetchLeadsCount,
 * which has its own memory + localStorage cache, so revisiting a year costs
 * nothing.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMonthlyWinRateCounts } from "../services/winRateService";

const STALE = 1000 * 60 * 5; // 5 min — silent refresh interval
const GC = 1000 * 60 * 30;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The Won / Active / Lost status lists live in the service now, next to the
// queries that send them — see WON_STATUSES / ACTIVE_STATUSES / LOST_STATUSES
// in services/winRateService. They were duplicated here as lowercase sets for
// client-side matching; with the counting done server-side there is nothing
// left to match, and one copy cannot drift from the other.

const buildEmptyMonth = (label) => ({
  month: label,
  won: 0,
  lost: 0,
  active: 0,
  total: 0,
  winRate: 0,
});

const computeTrend = (current, previous) => {
  if (previous === 0 && current === 0) return { direction: "flat", pct: 0 };
  if (previous === 0) return { direction: "up", pct: 100 };
  const delta = current - previous;
  const pct = Math.round((delta / previous) * 100);
  return {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    pct: Math.abs(pct),
  };
};

export const useWinRateAnalytics = ({
  filters,
  year = new Date().getFullYear(),
  enabled = true,
}) => {
  const { data: months, isLoading, isFetching, isError } = useQuery({
    queryKey: ["win-rate-monthly", filters, year],
    queryFn: () => fetchMonthlyWinRateCounts({ filters, year }),
    enabled,
    staleTime: STALE,
    gcTime: GC,
    refetchInterval: 60 * 60 * 1000, // silent background refresh every 60 min
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const aggregated = useMemo(() => {
    const monthly = MONTH_LABELS.map(buildEmptyMonth);
    const counts = months || [];

    monthly.forEach((row, i) => {
      const c = counts[i] || {};
      row.won = c.won || 0;
      row.active = c.active || 0;
      row.lost = c.lost || 0;
      row.total = row.won + row.active + row.lost;
    });

    // Compute winRate per month — Won / (Won + Lost) × 100.
    for (const row of monthly) {
      const denom = row.won + row.lost;
      row.winRate = denom ? Number(((row.won / denom) * 100).toFixed(1)) : 0;
    }

    // Annual totals.
    let totalWon = 0;
    let totalLost = 0;
    let totalActive = 0;
    for (const r of monthly) {
      totalWon += r.won;
      totalLost += r.lost;
      totalActive += r.active;
    }
    const overallWinRate =
      totalWon + totalLost
        ? Number(((totalWon / (totalWon + totalLost)) * 100).toFixed(1))
        : 0;

    // Best month: max winRate, tie-broken by raw `won` count so a 1/1 month
    // doesn't beat a 8/15 month.
    let bestMonth = null;
    for (const r of monthly) {
      if (r.won + r.lost === 0) continue;
      if (
        !bestMonth ||
        r.winRate > bestMonth.winRate ||
        (r.winRate === bestMonth.winRate && r.won > bestMonth.won)
      ) {
        bestMonth = r;
      }
    }

    // Month-over-month trend (current month vs previous).
    const now = new Date();
    const isCurrentYear = year === now.getFullYear();
    const currentIdx = isCurrentYear ? now.getMonth() : 11;
    const prevIdx = currentIdx - 1;
    const cur = monthly[currentIdx] || buildEmptyMonth("");
    const prev = prevIdx >= 0 ? monthly[prevIdx] : buildEmptyMonth("");

    const trends = {
      won: computeTrend(cur.won, prev.won),
      lost: computeTrend(cur.lost, prev.lost),
      winRate: computeTrend(cur.winRate, prev.winRate),
    };

    const pieData = [
      { name: "Won", value: totalWon, fill: "#10B981" },
      { name: "Active", value: totalActive, fill: "#3B82F6" },
      { name: "Lost", value: totalLost, fill: "#EF4444" },
    ];

    // Distinguish "no data anywhere" from "no wins yet" — both need empty UX,
    // but only `isEmpty` should hide KPIs / donut.
    const isEmpty = totalWon + totalLost + totalActive === 0;
    const hasWins = totalWon > 0;

    return {
      monthlyData: monthly,
      pieData,
      summary: {
        totalWon,
        totalLost,
        totalActive,
        overallWinRate,
        bestMonth,
        trends,
      },
      isEmpty,
      hasWins,
    };
  }, [months, year]);

  return {
    ...aggregated,
    isLoading,
    isFetching,
    isError,
  };
};
