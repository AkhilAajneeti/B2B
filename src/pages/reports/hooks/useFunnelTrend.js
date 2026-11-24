/**
 * Funnel stages, month by month.
 *
 * Feeds the line chart that replaced the horizontal funnel bars. The bars were
 * a SNAPSHOT — seven stages for one month — which answers "where is the
 * pipeline right now" but not "is it getting better". One line per stage over
 * Jan–Dec answers the second question, which is what the chart on the
 * Dashboard does for lead sources.
 *
 * `New` is not among the series, by request. It would also flatten everything
 * else: every lead passes through New and most stay there, so its line sets
 * the Y scale and the six stages that matter collapse onto the axis.
 *
 * Counted server-side, one small query per (month × stage) — see
 * fetchMonthlyFunnelCounts. The obvious alternative was to group the records
 * the funnel already holds, which is free; that dataset is capped at the 5,000
 * newest leads, and the whole point of this chart is the months furthest from
 * today, which are exactly the ones a newest-first cap drops.
 *
 * NOTE ON SCOPE: this covers the whole YEAR, while the stat chips and the
 * drop-off callouts beside it describe the selected month. They answer
 * different questions on purpose — "how has the pipeline moved this year"
 * against "where does it stand this month".
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMonthlyFunnelCounts } from "../services/winRateService";
import { FUNNEL_STAGES } from "./useFunnelAnalytics";

const STALE = 1000 * 60 * 5;
const GC = 1000 * 60 * 30;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The stages drawn, in pipeline order.
 *
 * Derived from FUNNEL_STAGES rather than re-listed, so the colours stay the
 * ones validated for colour-blind separation against the chart surface, and
 * adding a stage to the funnel adds it here too. Only `New` is dropped.
 */
export const TREND_STAGES = FUNNEL_STAGES.filter((s) => s.key !== "New");

export const useFunnelTrend = ({
  filters,
  year = new Date().getFullYear(),
  enabled = true,
}) => {
  const { data: months, isLoading, isFetching, isError } = useQuery({
    queryKey: ["funnel-trend", filters, year],
    queryFn: () => fetchMonthlyFunnelCounts({ filters, year, stages: TREND_STAGES }),
    enabled,
    staleTime: STALE,
    gcTime: GC,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  return useMemo(() => {
    const rows = months || [];

    const chartData = MONTH_LABELS.map((label, i) => {
      const row = { label };
      for (const stage of TREND_STAGES) row[stage.key] = rows[i]?.[stage.key] || 0;
      return row;
    });

    const totals = {};
    let grandTotal = 0;
    for (const stage of TREND_STAGES) {
      const n = chartData.reduce((sum, r) => sum + (r[stage.key] || 0), 0);
      totals[stage.key] = n;
      grandTotal += n;
    }

    return {
      chartData,
      totals,
      grandTotal,
      // Every month at zero across every stage. Distinguished from loading so
      // the chart can say "nothing here" rather than spin forever.
      isEmpty: grandTotal === 0,
      isLoading,
      isFetching,
      isError,
    };
  }, [months, isLoading, isFetching, isError]);
};

export default useFunnelTrend;
