import React, { memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Icon from "../../../components/AppIcon";
import { useFunnelTrend, TREND_STAGES } from "../hooks/useFunnelTrend";

/**
 * Funnel stages over the year, one line per stage.
 *
 * Built to match the Dashboard's "Lead Source Performance" chart, which is
 * the reference this was asked for: same LineChart construction, same dashed
 * grid on both axes, same strokeWidth 2 with r=4 dots and r=6 active dots,
 * a Recharts <Legend /> under the plot, and a totals strip below a divider.
 *
 * EVERY STAGE IS DRAWN, including stages sitting at zero all year — the
 * reference draws all of its series too, and dropping one would also drop it
 * from the legend, which is where the colour key lives. The cost is that a
 * stage with no leads is a flat line along the axis.
 *
 * COLOURS come from FUNNEL_STAGES via TREND_STAGES — the `to` tone, which is
 * the dark end of each stage's pair. Measured against both card surfaces:
 * 3.1–5.7:1 in light, 3.0–5.6:1 in dark, all above the 3:1 non-text floor.
 * The pale `from` tones are for bar fills and do not survive being a 2px line
 * on white, which is why they are not used here.
 */

/** Rows are only drawn for series the hovered month actually has. */
const TrendTooltip = ({ active, payload, label, year }) => {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((p) => (p.value || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0));
  const total = payload.reduce((n, p) => n + (p.value || 0), 0);

  return (
    <div className="rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] px-3.5 py-3 text-xs min-w-[190px]">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="font-semibold text-popover-foreground">
          {label} {year}
        </span>
        <span className="text-[11px] text-muted-foreground">{total} total</span>
      </div>

      {rows.length === 0 ? (
        // Saying so beats an empty box, which reads as a broken tooltip.
        <div className="text-muted-foreground">No movement this month</div>
      ) : (
        <div className="space-y-1">
          {rows.map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: p.stroke }}
                />
                {p.name}
              </span>
              <span className="font-semibold text-popover-foreground">{p.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FunnelTrendChart = ({ filters = {}, enabled = true, year }) => {
  const chartYear = year || new Date().getFullYear();
  const { chartData, totals, grandTotal, isEmpty, isLoading } = useFunnelTrend({
    filters,
    year: chartYear,
    enabled,
  });

  return (
    <div className="w-full">
      <div className="h-80">
        {isLoading && isEmpty ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" />
              Loading pipeline trend…
            </span>
          </div>
        ) : isEmpty ? (
          <div className="h-full grid place-items-center text-center px-4">
            <div>
              <Icon name="LineChart" size={22} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                No pipeline movement in {chartYear}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stages fill in as leads progress past New.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />

              <XAxis
                dataKey="label"
                stroke="rgb(var(--color-muted-foreground))"
                fontSize={12}
              />

              <YAxis
                stroke="rgb(var(--color-muted-foreground))"
                fontSize={12}
                width={35}
                allowDecimals={false}
                domain={[0, "dataMax + 1"]}
              />

              <Tooltip content={<TrendTooltip year={chartYear} />} />

              <Legend wrapperStyle={{ fontSize: 12 }} />

              {TREND_STAGES.map((stage) => (
                <Line
                  key={stage.key}
                  type="monotone"
                  dataKey={stage.key}
                  name={stage.label}
                  stroke={stage.to}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Totals strip, matching the reference: a divider, then a dot and a
          number per series, with the grand total last. */}
      {!isEmpty && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex gap-6 overflow-x-auto no-scrollbar sm:justify-center text-sm px-2">
            {TREND_STAGES.map((stage) => (
              <div key={stage.key} className="flex items-center gap-2 min-w-max">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.to }}
                />
                <span>
                  {stage.label}: {totals[stage.key] || 0}
                </span>
              </div>
            ))}

            <div className="flex items-center gap-2 font-semibold min-w-max">
              <Icon name="Target" size={16} />
              <span>Total: {grandTotal}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(FunnelTrendChart);
