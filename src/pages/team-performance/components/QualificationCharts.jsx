import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Qualified leads, shown as a COMPOSITION rather than a distribution.
 *
 * The question these answer is the one the team actually asks: of everything we
 * call qualified, how much is still qualified today, and how much is a lead
 * that was qualified and then changed to Not Interested or another negative
 * status? Both halves count — that is the whole point of the Ever-Qualified
 * rule — so the right picture is one total split in two, not two separate
 * numbers and not a timing histogram.
 *
 *   Still qualified   = Ever-Qualified - Qualified-then-changed
 *   Changed after     = held a qualifying status, now negative
 *   -------------------------------------------------------
 *   together          = Ever-Qualified
 *
 * An earlier version plotted how LONG each lead took to be reversed. It was
 * answering a question nobody asked (is anyone gaming the status?) and burying
 * the one they did. That signal now lives in the Suspect tile and column, where
 * a 5-out-of-1,843 number belongs — far too small to earn a chart segment, and
 * as a third colour it would have been invisible.
 *
 * COLOUR. Two slots, same meaning in both charts:
 *   still qualified -> blue   #2a78d6 light / #3987e5 dark
 *   changed after   -> orange #eb6834 light / #d95926 dark
 *
 * Validated, not eyeballed: colour-vision separation ΔE 24.7 light / 26.8 dark
 * against a ≥8 target, normal-vision 33.6 / 31.8 against a ≥15 floor, both over
 * 3:1 on their surface. A blue/orange/red three-segment version was tried first and
 * FAILED — orange beside red measures ΔE 10.8 normal-vision in light mode and
 * 6.8 in dark, i.e. hard to tell apart even with full colour vision.
 */

const VIZ_STYLE = `
.tp-viz {
  --viz-kept: #2a78d6;
  --viz-changed: #eb6834;
  --viz-grid: #e1e0d9;
  --viz-axis: #898781;
  --viz-surface: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tp-viz {
    --viz-kept: #3987e5;
    --viz-changed: #d95926;
    --viz-grid: #2c2c2a;
    --viz-axis: #898781;
    --viz-surface: #1a1a19;
  }
}
:root[data-theme="dark"] .tp-viz {
  --viz-kept: #3987e5;
  --viz-changed: #d95926;
  --viz-grid: #2c2c2a;
  --viz-axis: #898781;
  --viz-surface: #1a1a19;
}
`;

const KEPT = "Still qualified";
const CHANGED = "Changed after qualifying";

const AXIS = { stroke: "var(--viz-axis)", fontSize: 11, tickLine: false };

const TooltipBox = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((n, e) => n + (e.value || 0), 0);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 text-muted-foreground">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ background: entry.color }}
          />
          {entry.name}:{" "}
          <span className="font-semibold text-foreground">{entry.value}</span>
          {total > 0 && ` (${Math.round((entry.value / total) * 100)}%)`}
        </p>
      ))}
      <p className="mt-1 border-t border-border pt-1 font-semibold text-foreground">
        Qualified: {total}
      </p>
    </div>
  );
};

const Panel = ({ title, subtitle, height = "h-64", children, empty }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
      {subtitle}
    </p>
    <div className={`mt-4 ${height}`}>
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No qualified leads in this period.
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

/* A 2px ring in the surface colour separates stacked segments, so the boundary
   reads as a break rather than two colours touching. */
const SEGMENT_GAP = { stroke: "var(--viz-surface)", strokeWidth: 2 };

const QualificationCharts = ({ totals, rows = [] }) => {
  const kept = Math.max(0, (totals?.everQualified ?? 0) - (totals?.qualifiedThenDropped ?? 0));
  const changed = totals?.qualifiedThenDropped ?? 0;
  const total = kept + changed;

  const teamData = [{ name: "Team", [KEPT]: kept, [CHANGED]: changed }];

  // Sorted by TOTAL qualified, largest first. The previous version sorted by
  // flagged count, which pushed a rep with 146 qualified leads into the middle
  // of the chart behind reps with two.
  const repData = rows
    .filter((r) => r.everQualified > 0)
    .map((r) => ({
      name: (r.name || "Unassigned").split(" ")[0],
      [KEPT]: Math.max(0, r.everQualified - r.qualifiedThenDropped),
      [CHANGED]: r.qualifiedThenDropped,
      total: r.everQualified,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const pctChanged = total ? Math.round((changed / total) * 100) : 0;

  return (
    <div className="tp-viz grid gap-4 lg:grid-cols-2">
      <style>{VIZ_STYLE}</style>

      <Panel
        title="What makes up our qualified leads"
        subtitle={`${total.toLocaleString()} qualified in this period. ${changed.toLocaleString()} of them (${pctChanged}%) were qualified first and changed to a negative status afterwards — they still count, because the buyer was genuinely interested at the time.`}
        height="h-40"
        empty={total === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={teamData}
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <XAxis type="number" {...AXIS} axisLine={false} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }} content={<TooltipBox />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={KEPT} stackId="q" fill="var(--viz-kept)" {...SEGMENT_GAP} maxBarSize={56} />
            <Bar
              dataKey={CHANGED}
              stackId="q"
              fill="var(--viz-changed)"
              {...SEGMENT_GAP}
              maxBarSize={56}
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title="The same split, by rep"
        subtitle="Each bar is that rep's total qualified leads. The orange part is what they qualified and later lost — a tall orange share is a nurturing problem, not a qualifying one. Top 10 by volume."
        empty={repData.length === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={repData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
            <XAxis dataKey="name" {...AXIS} axisLine={{ stroke: "var(--viz-grid)" }} interval={0} />
            <YAxis {...AXIS} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }} content={<TooltipBox />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
            <Bar dataKey={KEPT} stackId="q" fill="var(--viz-kept)" {...SEGMENT_GAP} maxBarSize={40} />
            <Bar
              dataKey={CHANGED}
              stackId="q"
              fill="var(--viz-changed)"
              {...SEGMENT_GAP}
              maxBarSize={40}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
};

export default QualificationCharts;
