import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * The two charts behind the suspect-qualification guard.
 *
 * COLOUR. Two roles only, and the same two in both charts so "red = a
 * qualification we do not trust" never changes meaning between them:
 *
 *   trusted  -> categorical blue   #2a78d6 light / #3987e5 dark
 *   suspect  -> status critical    #d03b3b, fixed in both modes
 *
 * That pair was validated rather than eyeballed — colour-vision separation
 * ΔE 23.8 light / 25.7 dark against a ≥8 target, normal-vision 31.6 / 31.9
 * against a ≥15 floor, both above 3:1 contrast on their surface. Colour also
 * never carries the meaning alone: both charts keep a legend, and the grouped
 * bars are directly labelled.
 *
 * The app has no dark theme today, but the dark steps are declared anyway —
 * they are separately chosen values for the dark surface, not an automatic
 * inversion of the light ones, which would fail contrast.
 */

const VIZ_STYLE = `
.tp-viz {
  --viz-trusted: #2a78d6;
  --viz-suspect: #d03b3b;
  --viz-grid: #e1e0d9;
  --viz-axis: #898781;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tp-viz {
    --viz-trusted: #3987e5;
    --viz-suspect: #d03b3b;
    --viz-grid: #2c2c2a;
    --viz-axis: #898781;
  }
}
:root[data-theme="dark"] .tp-viz {
  --viz-trusted: #3987e5;
  --viz-suspect: #d03b3b;
  --viz-grid: #2c2c2a;
  --viz-axis: #898781;
}
`;

const AXIS = {
  stroke: "var(--viz-axis)",
  fontSize: 11,
  tickLine: false,
};

const TooltipBox = ({ active, payload, label, suffix }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 text-muted-foreground">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: entry.color }}
          />
          {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
          {suffix}
        </p>
      ))}
    </div>
  );
};

/* The histogram is one data series whose COLOUR carries a second meaning, so
   it needs its own key — Recharts' legend would only say "Leads". Without this
   the red/blue split would be colour alone, which is exactly what the
   accessibility rule forbids. */
const Key = ({ items }) => (
  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

const Panel = ({ title, subtitle, children, empty, legend }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
      {subtitle}
    </p>
    {legend}
    <div className="mt-4 h-64">
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Nothing to plot in this period.
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const QualificationCharts = ({ histogram = [], rows = [], suspectHours }) => {
  const histogramEmpty = histogram.every((b) => !b.count);

  // Only reps who actually qualified something, worst first — the chart exists
  // to surface where reversals concentrate, and reps with nothing to show would
  // just dilute the axis. Capped so the bars stay readable; the full picture is
  // in the table below.
  const repData = rows
    .filter((r) => r.everQualified > 0)
    .sort((a, b) => b.suspect - a.suspect || b.everQualified - a.everQualified)
    .slice(0, 8)
    .map((r) => ({
      name: (r.name || "Unassigned").split(" ")[0],
      Trusted: r.genuine,
      Suspect: r.suspect,
    }));

  return (
    <div className="tp-viz grid gap-4 lg:grid-cols-2">
      <style>{VIZ_STYLE}</style>

      <Panel
        title="How long before a qualified lead was reversed"
        subtitle={`Every lead that held a qualifying status and is now negative, by how long it lived. A pile-up in the first bars is the signal — it means the status was tagged and undone, not worked. Bars inside the ${suspectHours}-hour window are counted as suspect.`}
        empty={histogramEmpty}
        legend={
          <Key
            items={[
              { label: `Suspect — reversed within ${suspectHours}h`, color: "var(--viz-suspect)" },
              { label: "Trusted — reversed later", color: "var(--viz-trusted)" },
            ]}
          />
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
            <XAxis dataKey="label" {...AXIS} axisLine={{ stroke: "var(--viz-grid)" }} interval={0} angle={-20} textAnchor="end" height={48} />
            <YAxis {...AXIS} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }} content={<TooltipBox suffix=" leads" />} />
            {/* 4px rounded data-ends, anchored to the baseline. */}
            <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {histogram.map((b) => (
                <Cell
                  key={b.key}
                  fill={b.suspect ? "var(--viz-suspect)" : "var(--viz-trusted)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="Trusted vs suspect qualifications, by rep"
        subtitle="Suspect leads are still counted as qualified — nothing is removed. This is the split, so a reversal pattern belongs to a person rather than to the team average. Worst first, top 8."
        empty={repData.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={repData} margin={{ top: 16, right: 8, left: -18, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
            <XAxis dataKey="name" {...AXIS} axisLine={{ stroke: "var(--viz-grid)" }} interval={0} />
            <YAxis {...AXIS} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }} content={<TooltipBox />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Bar dataKey="Trusted" fill="var(--viz-trusted)" radius={[4, 4, 0, 0]} maxBarSize={28}>
              <LabelList dataKey="Trusted" position="top" fontSize={10} fill="var(--viz-axis)" />
            </Bar>
            <Bar dataKey="Suspect" fill="var(--viz-suspect)" radius={[4, 4, 0, 0]} maxBarSize={28}>
              <LabelList dataKey="Suspect" position="top" fontSize={10} fill="var(--viz-axis)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
};

export default QualificationCharts;
