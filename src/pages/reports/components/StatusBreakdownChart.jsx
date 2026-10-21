import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchWinRateDataset,
  readCachedDataset,
} from "../services/winRateService";

/**
 * Where leads ARE, and where leads STOP. Admin-only; replaces the Win Rate
 * panel for those accounts.
 *
 * Two charts because they answer two different questions that a single chart
 * cannot answer at once:
 *
 *   1. CURRENT STATUS — how many leads sit in each positive status right now.
 *      A snapshot. Useful for "what is on our plate".
 *
 *   2. EVER-REACHED FUNNEL — how many leads have reached each stage at any
 *      point, counting a lead at EVERY stage up to its furthest.
 *
 * Why the second one has to exist. A funnel drawn from current status is
 * nonsense: a lead that bought is no longer counted in Follow up, so the bars
 * do not decrease and the "drops" between them are comparing different leads.
 * That is where "Highest drop: Invitation Sent -100%" comes from — nobody is
 * sitting in Invitation Sent today, while Visit Done has leads that passed
 * straight through it. The ever-reached version counts each lead once per stage
 * it actually reached, so it decreases by construction and every drop is real.
 *
 * FORM. Horizontal bars, held in pipeline order rather than sorted by size.
 * Horizontal because the stage names are long — "Site Visit Scheduled",
 * "Qualified Due To Delay" — and vertical columns would force rotated labels.
 * Pipeline order because the stages are a journey, not a ranking; sorting them
 * by count would destroy the only structure the reader has.
 *
 * Deliberately NOT a radar. A radar's filled area changes shape when you
 * reorder the axes while the numbers stay identical, so the most prominent
 * thing on it encodes nothing; it also loops the last stage back to the first,
 * implying a cycle a pipeline does not have; and on one radial axis a stage
 * with 2 leads is indistinguishable from one with 20 when another has 594.
 *
 * COLOUR. One hue, darker further down the pipeline — this is magnitude on an
 * ordered scale, not seven competing identities, so a sequential ramp is the
 * honest encoding and categorical hues would imply a distinction that is not
 * there. Steps are taken from the validated blue ramp and kept at or above
 * step 250 in light mode, the documented floor for an ordinal ramp (a lighter
 * step would recede into the surface).
 */

const YEAR = new Date().getFullYear();

/** Pipeline order. `status` is the RAW stored value, which is not always the
 *  label — QDTD is stored as the code. A wrong string here counts zero and
 *  looks like a genuinely empty stage, so these match the values the working
 *  status filter sends. */
const STAGES = [
  { status: "Follow up", label: "Follow up" },
  { status: "Interested", label: "Interested" },
  { status: "Site Visit Scheduled", label: "Visit Scheduled" },
  { status: "Invitation Sent", label: "Invitation Sent" },
  { status: "Site Visit Done", label: "Visit Done" },
  { status: "Purchased", label: "Purchased" },
  { status: "QDTD", label: "Qualified Due To Delay" },
];

/* Blue ramp, light -> dark along the pipeline. Light-mode steps stay at or
   above 250; the dark column is stepped for the dark surface, not inverted. */
const RAMP_LIGHT = ["#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab"];
const RAMP_DARK = ["#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec"];

const VIZ_STYLE = `
.sb-viz { --sb-grid: #e1e0d9; --sb-axis: #898781; ${RAMP_LIGHT.map((c, i) => `--sb-${i}: ${c};`).join(" ")} }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .sb-viz { --sb-grid: #2c2c2a; --sb-axis: #898781; ${RAMP_DARK.map((c, i) => `--sb-${i}: ${c};`).join(" ")} }
}
:root[data-theme="dark"] .sb-viz { --sb-grid: #2c2c2a; --sb-axis: #898781; ${RAMP_DARK.map((c, i) => `--sb-${i}: ${c};`).join(" ")} }
`;

const norm = (s) => (s || "").trim().toLowerCase();

const TooltipBox = ({ active, payload, caption }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{row.label}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-semibold text-foreground">
          {row.value.toLocaleString()}
        </span>{" "}
        {caption}
      </p>
      {row.pct != null && (
        <p className="mt-0.5 text-muted-foreground">
          {row.pct}% of everyone who reached the first stage
        </p>
      )}
    </div>
  );
};

const Chart = ({ data, caption }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      layout="vertical"
      data={data}
      margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
    >
      <CartesianGrid stroke="var(--sb-grid)" horizontal={false} />
      <XAxis type="number" hide />
      <YAxis
        type="category"
        dataKey="label"
        width={132}
        stroke="var(--sb-axis)"
        fontSize={11}
        tickLine={false}
        axisLine={false}
      />
      <Tooltip
        cursor={{ fill: "var(--sb-grid)", opacity: 0.35 }}
        content={<TooltipBox caption={caption} />}
      />
      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
        {data.map((d, i) => (
          <Cell key={d.label} fill={`var(--sb-${i})`} />
        ))}
        {/* Direct labels: the value is the point, and reading it off a hidden
            axis would mean hovering every bar. */}
        <LabelList
          dataKey="value"
          position="right"
          fontSize={11}
          fill="var(--sb-axis)"
          formatter={(v) => v.toLocaleString()}
        />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

const Panel = ({ title, subtitle, children, state }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
    <div className="mt-4 h-[272px]">
      {state ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          {state}
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

const StatusBreakdownChart = ({ filters = {}, enabled = true }) => {
  const { data, isLoading, isError } = useQuery({
    // Same key as the Win Rate and Funnel charts, so this panel reads the
    // dataset the page has already fetched instead of pulling it again.
    queryKey: ["win-rate-dataset", filters, YEAR],
    queryFn: () => fetchWinRateDataset({ filters, year: YEAR }),
    enabled,
    initialData: () => readCachedDataset(filters, YEAR)?.list ?? undefined,
    initialDataUpdatedAt: 0,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { current, reached, total } = useMemo(() => {
    const records = Array.isArray(data) ? data : [];
    const now = new Map(STAGES.map((s) => [norm(s.status), 0]));
    const ever = new Map(STAGES.map((s) => [norm(s.status), 0]));

    for (const lead of records) {
      const status = norm(lead?.status);
      if (now.has(status)) now.set(status, now.get(status) + 1);

      // Ever-reached: the union of the lead's history and where it stands now.
      // Counted once per stage, so a lead that bounced in and out of Follow up
      // does not inflate that stage.
      const held = new Set();
      if (Array.isArray(lead?.cStatusObj)) {
        lead.cStatusObj.forEach((s) => held.add(norm(s)));
      }
      if (status) held.add(status);
      for (const stage of held) {
        if (ever.has(stage)) ever.set(stage, ever.get(stage) + 1);
      }
    }

    const currentRows = STAGES.map((s) => ({
      label: s.label,
      value: now.get(norm(s.status)) || 0,
    }));

    const reachedRaw = STAGES.map((s) => ever.get(norm(s.status)) || 0);
    const base = reachedRaw[0] || 0;
    const reachedRows = STAGES.map((s, i) => ({
      label: s.label,
      value: reachedRaw[i],
      pct: base ? Math.round((reachedRaw[i] / base) * 100) : null,
    }));

    return {
      current: currentRows,
      reached: reachedRows,
      total: records.length,
    };
  }, [data]);

  const emptyState = isError
    ? "Could not load the dataset."
    : isLoading && total === 0
      ? "Loading…"
      : total === 0
        ? "No leads in this period."
        : null;

  return (
    <div className="sb-viz grid grid-cols-1 gap-6 lg:grid-cols-2">
      <style>{VIZ_STYLE}</style>

      <Panel
        title="Where leads are now"
        subtitle={`Leads sitting in each positive status today, in pipeline order · ${YEAR}. A snapshot of what is on the team's plate — not a funnel, because a lead only appears in the one stage it currently occupies.`}
        state={emptyState}
      >
        <Chart data={current} caption="leads in this status now" />
      </Panel>

      <Panel
        title="Where leads stop"
        subtitle="Every lead counted at each stage it has ever reached, so this decreases down the pipeline and each gap is a real drop-off. A lead that went straight to Visit Done still counts at Follow up and Interested."
        state={emptyState}
      >
        <Chart data={reached} caption="leads reached this stage" />
      </Panel>
    </div>
  );
};

export default StatusBreakdownChart;
