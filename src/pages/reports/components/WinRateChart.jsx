import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { useWinRateAnalytics } from "../hooks/useWinRateAnalytics";

const PRIMARY = "#8B5CF6";
const PRIMARY_DARK = "#6D28D9";
/**
 * The chart always covers the CURRENT year — there is no year picker.
 *
 * `year` is still threaded through the hook and the tooltip rather than read
 * from this constant in each of them, so pointing the chart at another year is
 * a one-line change here instead of a hunt through the file.
 */
const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// Tooltip — shows won / lost / active / win rate
// ---------------------------------------------------------------------------

const LineTooltip = ({ active, payload, label, year }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="rounded-xl border border-white/40 bg-card/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] px-3.5 py-3 text-xs min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-900">
          {label} {year}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300 bg-violet-50 px-2 py-0.5 rounded-full">
          {row.winRate}%
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-500">Won</span>
          </div>
          <span className="font-semibold text-slate-900 tabular-nums">
            {row.won}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-slate-500">Lost</span>
          </div>
          <span className="font-semibold text-slate-900 tabular-nums">
            {row.lost}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-500">Active</span>
          </div>
          <span className="font-semibold text-slate-900 tabular-nums">
            {row.active}
          </span>
        </div>
      </div>
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  const data = slice?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border border-white/40 bg-card/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] px-3.5 py-2.5 text-xs min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: data.fill }}
        />
        <span className="font-semibold text-slate-900">{data.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-500">
        <span>Leads</span>
        <span className="font-semibold text-slate-900 tabular-nums">
          {data.value}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// KPI tile with trend arrow
// ---------------------------------------------------------------------------

const TrendBadge = ({ trend, invert = false }) => {
  if (!trend) return null;
  const { direction, pct } = trend;
  // `invert` flips meaning for metrics where lower is better (e.g. lost).
  const isGood =
    direction === "flat"
      ? null
      : invert
        ? direction === "down"
        : direction === "up";

  const colorClass =
    isGood === null
      ? "text-slate-400 bg-slate-100"
      : isGood
        ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50"
        : "text-rose-700 dark:text-rose-300 bg-rose-50";

  const arrow =
    direction === "up" ? "ArrowUpRight" : direction === "down" ? "ArrowDownRight" : "Minus";

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${colorClass}`}
    >
      <Icon name={arrow} size={10} />
      {direction === "flat" ? "0%" : `${pct}%`}
    </span>
  );
};

const KpiTile = ({ icon, iconColor, label, value, trend, invert, accent }) => (
  <div className="rounded-xl bg-slate-50/80 border border-slate-100 px-4 py-3">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={14} className={iconColor} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <TrendBadge trend={trend} invert={invert} />
    </div>
    <div
      className={`text-2xl font-bold tabular-nums ${
        accent ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent" : "text-slate-900"
      }`}
    >
      {value}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

const EmptyState = ({
  iconName = "BarChart3",
  title = "No analytics available yet",
  message = "Once leads are created and moved through statuses, win rate trends will appear here.",
}) => (
  <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
      <Icon name={iconName} size={24} className="text-violet-500 dark:text-violet-400" />
    </div>
    <div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5 max-w-sm">{message}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Skeleton (shimmer)
// ---------------------------------------------------------------------------

const Skeleton = () => (
  <div className="h-full flex flex-col gap-3 p-2 relative overflow-hidden rounded-lg">
    <div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
      style={{ animation: "wrc-shimmer 1.6s infinite" }}
    />
    <div className="flex-1 flex items-end gap-2">
      {[40, 60, 50, 75, 65, 80, 55, 70, 60, 85, 70, 90].map((h, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-200 rounded-t"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
    <style>{`
      @keyframes wrc-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

// ---------------------------------------------------------------------------

/**
 * `embedded` drops the card chrome so this can sit INSIDE another card —
 * which is where it lives on Reports, in the right column of the Sales Funnel
 * panel. Without it you get a bordered, padded, shadow-on-hover card nested in
 * a bordered, padded card, and the inset reads as a mistake rather than as
 * structure. It also skips the scale-in: the parent card has already animated
 * in, and a second entrance inside it looks like a stutter.
 */
const WinRateChart = ({ filters = {}, enabled = true, embedded = false }) => {
  const [chartType, setChartType] = useState("bar");
  const year = CURRENT_YEAR;

  const {
    monthlyData,
    summary,
    isEmpty,
    hasWins,
    isLoading,
    isFetching,
  } = useWinRateAnalytics({ filters, year, enabled });

  return (
    <motion.div
      initial={embedded ? false : { opacity: 0, scale: 0.96 }}
      animate={embedded ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={
        embedded
          ? "h-full flex flex-col"
          : "bg-card border border-border rounded-xl p-4 sm:p-6 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] transition-shadow duration-500"
      }
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 bg-clip-text text-transparent">
              Win Rate Analytics
            </span>
            {isFetching && !isLoading && (
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            By the month each lead arrived · {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={chartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setChartType("bar")}
            iconName="TrendingUp"
            iconPosition="left"
          >
            Trend
          </Button>
        </div>
      </div>

      {/* Chart body */}
      <div className={embedded ? "h-80 flex-1 min-h-[18rem]" : "h-80"}>
        {isLoading && (!monthlyData || monthlyData.every((m) => m.total === 0)) ? (
          <Skeleton />
        ) : isEmpty ? (
          <EmptyState />
        ) : chartType === "bar" && !hasWins ? (
          // Lost/active exist but zero purchases → every bar would be zero,
          // which draws as an empty plot rather than as information.
          <EmptyState
            iconName="Trophy"
            title="No closed deals yet"
            message="Move a lead to “Purchased” to start the win rate trend."
          />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <defs>
                {/* Top-lit so the bars read as solid objects rather than flat
                    blocks. Opaque at the cap and softening downward, which
                    also keeps the gridlines faintly visible through the feet
                    instead of being cut off by a hard edge. */}
                <linearGradient id="wrc-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY_DARK} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="rgb(var(--color-muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "rgb(var(--color-border))" }}
              />
              <YAxis
                stroke="rgb(var(--color-muted-foreground))"
                fontSize={11}
                domain={[0, "dataMax + 5"]}
                tickFormatter={(v) => `${v}%`}
                width={40}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<LineTooltip year={year} />}
                // A band, not the line cursor the area chart used: on bars a
                // dashed vertical rule reads as a data series of its own.
                cursor={{ fill: "rgb(var(--color-muted))", fillOpacity: 0.6 }}
              />
              <Bar
                dataKey="winRate"
                fill="url(#wrc-bar)"
                // Rounded caps only — a radius on all four corners makes a
                // short bar look like it floats off the axis.
                radius={[6, 6, 0, 0]}
                // Twelve months in a 3/5-width column: uncapped, Recharts
                // widens each bar to fill its slot and they merge into a
                // block. Capped, the gaps stay readable at any width.
                maxBarSize={38}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* KPI tiles */}
      {summary && !isEmpty && (
        <div
          className={`grid gap-3 mt-5 pt-5 border-t border-border ${
            // Four across a 3/5-width column squeezes every tile to about
            // 120px and wraps "May · 100%" onto two lines. Two across fits.
            embedded ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"
          }`}
        >
          <KpiTile
            icon="CheckCircle2"
            iconColor="text-emerald-600 dark:text-emerald-300"
            label="Total Won"
            value={summary.totalWon}
            trend={summary.trends?.won}
          />
          <KpiTile
            icon="XCircle"
            iconColor="text-rose-600 dark:text-rose-300"
            label="Total Lost"
            value={summary.totalLost}
            trend={summary.trends?.lost}
            invert
          />
          <KpiTile
            icon="Target"
            iconColor="text-violet-600 dark:text-violet-300"
            label="Win Rate"
            value={`${summary.overallWinRate}%`}
            trend={summary.trends?.winRate}
            accent
          />
          <KpiTile
            icon="TrendingUp"
            iconColor="text-amber-600 dark:text-amber-300"
            label="Best Month"
            value={
              summary.bestMonth
                ? `${summary.bestMonth.month} · ${summary.bestMonth.winRate}%`
                : "—"
            }
          />
        </div>
      )}
    </motion.div>
  );
};

export default memo(WinRateChart);
