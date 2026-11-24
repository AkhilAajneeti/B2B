import React, { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Icon from "../../../components/AppIcon";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { useFunnelAnalytics } from "../hooks/useFunnelAnalytics";
import FunnelTrendChart from "./FunnelTrendChart";
import { todayLocal } from "../../../utils/dateFilter";

const DATE_FILTER_OPTIONS = [
  { label: "This Month", value: "current" },
  { label: "Last Month", value: "last" },
  { label: "On", value: "on" },
  { label: "Between", value: "between" },
];

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currentMonthStart = () => {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
};

const todayInputValue = () => toDateInputValue(new Date());

// Resolve the human label for the currently selected month bucket.
const monthLabelFor = (month) => {
  const now = new Date();
  const target =
    month === "last"
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1)
      : new Date(now.getFullYear(), now.getMonth(), 1);
  return target.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const filterLabelFor = ({ filterType, selectedDate, startDate, endDate }) => {
  if (filterType === "on") return selectedDate || "Select date";
  if (filterType === "between") {
    return startDate && endDate ? `${startDate} to ${endDate}` : "Select date range";
  }
  return monthLabelFor(filterType);
};

// ---------------------------------------------------------------------------
// Tooltip for the funnel
// ---------------------------------------------------------------------------

const FunnelTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-white/40 bg-card/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] px-3.5 py-3 text-xs min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{
            background: `linear-gradient(135deg, ${row.from}, ${row.to})`,
          }}
        />
        <span className="font-semibold text-slate-900">{row.label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">Leads</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {row.count}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-500">% of top stage</span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {row.conversion}%
          </span>
        </div>
        {row.dropOff > 0 && (
          <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-slate-200/70">
            <span className="text-slate-500">Drop-off vs prev.</span>
            <span className="font-semibold text-rose-600 dark:text-rose-300 tabular-nums">
              −{row.dropOff}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// KPI strip above the chart
// ---------------------------------------------------------------------------

const KpiTile = ({ icon, iconColor, label, value, accent }) => (
  <div className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 py-2 min-w-0">
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon name={icon} size={12} className={iconColor} />
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider truncate">
        {label}
      </span>
    </div>
    <div
      className={`text-base font-bold tabular-nums truncate ${
        accent
          ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent"
          : "text-slate-900"
      }`}
    >
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Rep card
// ---------------------------------------------------------------------------

const initialsOf = (name = "") => name.trim().charAt(0).toUpperCase() || "?";

const SparklineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded px-2 py-1 text-xs shadow-sm">
      {payload[0]?.payload?.period}: <strong>{payload[0]?.value}</strong>
    </div>
  );
};

const RepCard = ({ rep, index }) => {
  const hasTrend = rep.trend.some((t) => t.value > 0);
  const growthBadge =
    rep.growthDirection === "up"
      ? { icon: "ArrowUpRight", className: "text-emerald-700 dark:text-emerald-300 bg-emerald-50" }
      : rep.growthDirection === "down"
        ? { icon: "ArrowDownRight", className: "text-rose-700 dark:text-rose-300 bg-rose-50" }
        : { icon: "Minus", className: "text-slate-500 bg-slate-100" };

  // Width of the active-leads progress bar relative to total.
  const activePct = rep.total > 0 ? Math.min(100, Math.round((rep.active / rep.total) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.03 * index }}
      className="group bg-card border border-border rounded-xl p-3.5 hover:shadow-[0_10px_30px_-10px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: rep.color }}
          >
            {initialsOf(rep.name)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {rep.name}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {rep.total} leads
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${growthBadge.className}`}
        >
          <Icon name={growthBadge.icon} size={10} />
          {rep.growthPct === 0
            ? "0%"
            : `${rep.growthPct > 0 ? "+" : ""}${rep.growthPct}%`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
        <div className="rounded-md bg-emerald-50 py-1">
          <div className="text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-medium">
            Won
          </div>
          <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
            {rep.purchased}
          </div>
        </div>
        <div className="rounded-md bg-blue-50 py-1">
          <div className="text-[9px] uppercase tracking-wider text-blue-700 dark:text-blue-300 font-medium">
            Active
          </div>
          <div className="text-sm font-bold text-blue-700 dark:text-blue-300 tabular-nums">
            {rep.active}
          </div>
        </div>
        <div className="rounded-md bg-violet-50 py-1">
          <div className="text-[9px] uppercase tracking-wider text-violet-700 dark:text-violet-300 font-medium">
            Conv
          </div>
          <div className="text-sm font-bold text-violet-700 dark:text-violet-300 tabular-nums">
            {rep.conversion}%
          </div>
        </div>
      </div>

      {/* Active-share progress bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Active share</span>
          <span className="font-medium text-slate-700 tabular-nums">{activePct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activePct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
          />
        </div>
      </div>

      {/* 8-week trend sparkline */}
      <div className="h-10 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rep.trend}>
            <Tooltip content={<SparklineTooltip />} cursor={false} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={hasTrend ? rep.color : "rgb(var(--color-border))"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: rep.color, strokeWidth: 0 }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>8-week activity</span>
        <span>
          {rep.trend[0]?.value} → {rep.trend[rep.trend.length - 1]?.value}
        </span>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

const EmptyState = ({ monthLabel }) => (
  <div className="flex flex-col items-center justify-center gap-3 text-center px-4 py-10">
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
      <Icon name="Filter" size={24} className="text-violet-500 dark:text-violet-400" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-700">
        No funnel data for {monthLabel}
      </p>
      <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
        Try another date filter, or check back once leads are created and moved through pipeline stages.
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

const Skeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Bar placeholder — mirrors the chart's shape, so the layout does not
        jump when the real data arrives. A circle here was left over from the
        radar and would have shifted everything on load. */}
    <div className="space-y-3 py-4 animate-pulse">
      {[72, 96, 54, 84, 40, 62, 30].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-5 rounded-r bg-slate-200" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-pulse">
      {[1, 2, 3, 4].map((_, i) => (
        <div key={i} className="h-44 bg-slate-200 rounded-xl" />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------

const ConversionFunnelChart = ({ filters = {}, enabled = true }) => {
  const [filterType, setFilterType] = useState("current");
  const [selectedDate, setSelectedDate] = useState(todayInputValue);
  const [startDate, setStartDate] = useState(currentMonthStart);
  const [endDate, setEndDate] = useState(todayInputValue);

  const funnelDateFilter = useMemo(() => {
    if (filterType === "on") {
      return {
        month: "current",
        dateFilter: "on",
        date: selectedDate,
      };
    }

    if (filterType === "between") {
      return {
        month: "current",
        dateFilter: "between",
        startDate,
        endDate,
      };
    }

    return { month: filterType };
  }, [filterType, selectedDate, startDate, endDate]);

  const periodLabel = filterLabelFor({
    filterType,
    selectedDate,
    startDate,
    endDate,
  });

  const handleStartDateChange = (value) => {
    setStartDate(value);
    if (endDate && value > endDate) setEndDate(value);
  };

  const {
    funnel,
    funnelStats,
    reps,
    isEmpty,
    isLoading,
    isFetching,
  } = useFunnelAnalytics({
    filters,
    ...funnelDateFilter,
    enabled,
  });

  const { highestDropOff, bestConversion, overallConversion, totalLeads } = funnelStats;

  // Shortened labels so long stage names ("Site Visit Scheduled") fit the
  // y-axis column. The full label stays on the row for the tooltip.
  const chartData = useMemo(
    () =>
      (funnel || []).map((f) => ({
        ...f,
        shortLabel: (f.label || "").replace("Site Visit ", "Visit "),
      })),
    [funnel],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] transition-shadow duration-500"
    >
        <div className="mb-5">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
                Sales Funnel
              </span>
              {isFetching && !isLoading && (
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {periodLabel} · lead pipeline progression
            </p>
          </div>

          {/* ───────────────────────────────────────────────────────────────
              DATE FILTER COMMENTED OUT — 2026-11-24, by request.

              The card stays on `filterType = "current"`, its initial value, so
              it is pinned to THIS MONTH and the subtitle still reads the period
              from `periodLabel` exactly as before — only the ability to change
              it is gone.

              The whole control group goes, not just the Select: the two date
              Inputs below it only render for the "on" and "between" options,
              which nothing can select any more.

              The `filterType` / `selectedDate` / `startDate` / `endDate` state
              and the Select / Input / todayLocal imports are left in place on
              purpose — they are what the block below needs, so restoring it is
              uncommenting and nothing else. Expect "declared but never read"
              hints on the setters until then.
              ─────────────────────────────────────────────────────────────── */}
          {/*
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 w-full sm:w-auto">
            <Select
              options={DATE_FILTER_OPTIONS}
              value={filterType}
              onChange={setFilterType}
              className="w-full sm:w-40"
              aria-label="Funnel date filter"
            />

            {filterType === "on" && (
              <Input
                type="date"
                max={todayLocal()}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-10 w-full sm:w-40"
                aria-label="Funnel date"
              />
            )}

            {filterType === "between" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  max={todayLocal()}
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  className="h-10 w-full sm:w-40"
                  aria-label="Funnel start date"
                />
                <Input
                  type="date"
                  max={todayLocal()}
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full sm:w-40"
                  aria-label="Funnel end date"
                />
              </div>
            )}
          </div>
          */}
        </div>

        {isLoading && isEmpty ? (
          <Skeleton />
        ) : isEmpty ? (
          <EmptyState monthLabel={periodLabel} />
        ) : (
          <>
          <div className="grid grid-cols-3 gap-2">
            <KpiTile
              icon="Users"
              iconColor="text-slate-500"
              label="In funnel"
              value={totalLeads}
            />
            <KpiTile
              icon="Target"
              iconColor="text-violet-600 dark:text-violet-300"
              label="Top → Won"
              value={`${overallConversion}%`}
              accent
            />
            <KpiTile
              icon="AlertTriangle"
              iconColor="text-rose-500 dark:text-rose-400"
              label="Top drop"
              value={highestDropOff ? `${highestDropOff.dropOff}%` : "—"}
            />
          </div>

          {/* Horizontal funnel bars, replaced 2026-11-24 by the stage
              trend chart below. Kept behind a false guard rather than a JSX
              comment because the block contains comments of its own, and a
              nested comment terminator would close the outer one early.

              Note the two now answer different timeframes: the bars showed
              one month, the lines show the year. Restoring them is deleting
              the guard and the FunnelTrendChart line. */}
          {false && (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 52, bottom: 4, left: 4 }}
                barCategoryGap={10}
              >
                {/* Recessive grid, and only along the measured axis — a
                    horizontal bar is read against the x scale, so
                    horizontal rules would cross every bar for nothing. */}
                <CartesianGrid
                  horizontal={false}
                  stroke="rgb(var(--color-border))"
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "rgb(var(--color-muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  width={112}
                  tick={{ fontSize: 11, fill: "rgb(var(--color-foreground))", fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<FunnelTooltip />}
                  cursor={{ fill: "rgba(15,23,42,0.04)" }}
                />
                <Bar
                  dataKey="count"
                  name="Leads"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive
                  animationDuration={700}
                  animationEasing="ease-out"
                >
                  {/* One fixed hue per stage. Colour follows the STAGE,
                      never its rank, so filtering to fewer stages never
                      repaints the survivors. */}
                  {chartData.map((row) => (
                    <Cell key={row.key || row.label} fill={row.to} />
                  ))}
                  {/* The count sits at the end of each bar, so the number
                      is readable without a tooltip and the lighter bars
                      carry a label rather than relying on fill alone. */}
                  <LabelList
                    dataKey="count"
                    position="right"
                    offset={8}
                    style={{ fontSize: 11, fontWeight: 700, fill: "#334155" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}

          <FunnelTrendChart filters={filters} enabled={enabled} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {bestConversion && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                  <Icon name="TrendingUp" size={12} />
                  Best conversion
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                  {bestConversion.label}
                </div>
              </div>
            )}
            {highestDropOff && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-medium">
                  <Icon name="AlertTriangle" size={12} />
                  Highest drop
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                  {highestDropOff.label}{" "}
                  <span className="text-xs font-medium text-rose-600 dark:text-rose-300">
                    −{highestDropOff.dropOff}%
                  </span>
                </div>
              </div>
            )}
          </div>
          </>
        )}

        {/* ───────────────────────────────────────────────────────────────
            Rep cards.

              SALES REP INSIGHTS COMMENTED OUT — 2026-11-24, by request, and
              replaced with the Win Rate chart. Commented rather than deleted
              so it can come back: uncomment the block below, delete the
              the Win Rate chart. That chart has since moved back out to its
              own full-width card below this one, so this column is gone and
              restoring the block means putting it somewhere sensible first.

              `reps` and `RepCard` are deliberately left in place rather than
              removed — they are what the commented block needs, and stripping
              them would turn a one-line restore into a rewrite.
              ─────────────────────────────────────────────────────────────── */}
            {/*
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Sales Rep Insights</h4>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                {reps.length} {reps.length === 1 ? "rep" : "reps"}
              </span>
            </div>
            {reps.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-10 border border-dashed border-slate-200 rounded-lg">
                No assigned reps in this period
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                {reps.map((rep, idx) => (
                  <RepCard key={rep.id} rep={rep} index={idx} />
                ))}
              </div>
            )}
            */}
    </motion.div>
  );
};

export default memo(ConversionFunnelChart);
