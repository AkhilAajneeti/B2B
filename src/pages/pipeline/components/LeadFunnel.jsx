import React from "react";
import { useQueries } from "@tanstack/react-query";
import Icon from "../../../components/AppIcon";
import { fetchLeadsCount } from "services/leads.service";

/* ------------------------------------------------------------------ *
 * Sales-stage funnel. The app's lead statuses don't map 1:1 to a clean
 * 6-stage funnel (there's no literal "Contacted"/"Negotiation" status),
 * so the mapping below is explicit and meant to be tuned. Each stage
 * counts the leads whose `status` falls in its `statuses` list.
 * ------------------------------------------------------------------ */
// Each stage borrows the color family of its representative status, using the
// app's soft tinted-gradient + colored-border style (bg light → background).
// Text is a dark shade of the same hue so it stays readable on the light fill.
const STAGES = [
  {
    key: "new",
    label: "New lead",
    sub: "uncontacted",
    grad: "bg-gradient-to-br from-blue-200 to-background border-blue-200",
    text: "text-blue-700",
    statuses: ["New"],
  },
  {
    key: "contacted",
    label: "Contacted",
    sub: "reached out",
    grad: "bg-gradient-to-br from-indigo-200 to-background border-indigo-200",
    text: "text-indigo-700",
    statuses: ["Follow up", "Call Later", "Call Not Connecting", "Call Not Picked"],
  },
  {
    key: "interested",
    label: "Interested",
    sub: "qualified",
    grad: "bg-gradient-to-br from-emerald-200 to-background border-emerald-200",
    text: "text-emerald-700",
    statuses: ["Interested", "Low Interest"],
  },
  {
    key: "sitevisit",
    label: "Site visit",
    sub: "property shown",
    grad: "bg-gradient-to-br from-sky-200 to-background border-sky-200",
    text: "text-sky-700",
    statuses: ["Site Visit Scheduled", "Site Visit Done"],
  },
  {
    key: "negotiation",
    label: "Negotiation",
    sub: "discussing terms",
    grad: "bg-gradient-to-br from-fuchsia-200 to-background border-fuchsia-200",
    text: "text-fuchsia-700",
    statuses: ["QDTD", "Low Budget"],
  },
  {
    key: "won",
    label: "Closed · won",
    sub: "booked",
    grad: "bg-gradient-to-br from-amber-200 to-background border-amber-200",
    text: "text-amber-700",
    statuses: ["Purchased", "Converted", "Booked"],
  },
];

// Drop-severity styling for the conversion pill. High conversion = minor drop
// (neutral); low conversion = major drop (red). Snapshot growth (>100%) reads
// as neutral, not alarming.
const dropSeverity = (conv) => {
  if (conv == null || conv >= 70) return "bg-slate-100 text-slate-600";
  if (conv >= 40) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-600";
};

const LeadFunnel = () => {
  // One count query per stage, across ALL leads (not just the pipeline's
  // follow-up window) so "New / uncontacted" and every stage are accurate.
  const results = useQueries({
    queries: STAGES.map((st) => ({
      queryKey: ["funnel-count", st.key, st.statuses],
      queryFn: () =>
        fetchLeadsCount([{ type: "in", attribute: "status", value: st.statuses }]),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const counts = results.map((r) => r.data || 0);
  const isLoading = results.some((r) => r.isLoading);
  const max = Math.max(...counts, 1);

  // "biggest drop" = the transition that loses the most leads.
  let biggestIdx = -1;
  let biggestDrop = -1;
  counts.forEach((c, i) => {
    if (i === 0) return;
    const drop = counts[i - 1] - c;
    if (drop > biggestDrop) {
      biggestDrop = drop;
      biggestIdx = i;
    }
  });

  const rows = STAGES.map((st, i) => {
    const count = counts[i];
    const prev = i > 0 ? counts[i - 1] : null;
    const conv = prev && prev > 0 ? Math.round((count / prev) * 100) : null;
    return {
      ...st,
      count,
      conv,
      biggest: i === biggestIdx,
      // A floor of 2% only, so a stage never vanishes entirely. The old 5%
      // meant small stages all bottomed out at the same size.
      widthPct: Math.max((count / max) * 100, 2),
    };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          How your leads are moving
        </h3>
        <span className="text-xs text-muted-foreground sm:text-sm">
          All open leads · by stage
        </span>
      </div>

      <div className={`space-y-2.5 transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {rows.map((r) => (
          /* THE ROW REFLOWS ON A PHONE instead of shrinking.
             Three fixed columns — label, bar, conversion — do not fit 360px:
             the labels wrapped to three lines and the bar track collapsed to
             a stub. Below sm the label and the conversion badge share the
             first line and the bar takes the full width underneath, which is
             the same information with room to read it.

             One markup, two layouts: `flex-wrap` plus an order swap, rather
             than a second copy of the row that could drift out of step. */
          <div
            key={r.key}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:flex-nowrap sm:gap-4"
          >
            {/* Stage label */}
            <div className="min-w-0 flex-1 text-left sm:w-28 sm:flex-none sm:text-right">
              <p className="text-sm font-semibold leading-tight text-foreground">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.sub}</p>
            </div>

            {/* Bar — centered within its track to form a true funnel shape */}
            {/* Centred at every size. Left-aligning the bars on a phone was
                the earlier fix for the squeeze, but it loses the funnel: the
                shape only reads as one when each bar narrows around a shared
                centre line. */}
            {/* The bar is centred, so every stage grows from one centre
                line and the column reads as a funnel. The count lives inside
                it, which sets the 2.75rem floor: narrow stages bottom out at
                the width their own number needs. */}
            <div className="order-last flex w-full min-w-0 justify-center sm:order-none sm:w-auto sm:flex-1">
              <div
                className={`flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold shadow-sm transition-[width] duration-700 ease-out ${r.grad} ${r.text}`}
                style={{ width: `${r.widthPct}%`, minWidth: "2.75rem" }}
              >
                {r.count}
              </div>
            </div>

            {/* Conversion + biggest-drop badge */}
            <div className="shrink-0 sm:w-28">
              {r.conv !== null && (
                <div className="flex flex-row items-center gap-1.5 sm:flex-col sm:items-start">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${dropSeverity(
                      r.conv,
                    )}`}
                  >
                    <Icon name="ArrowDown" size={12} />
                    {r.conv}%
                  </span>
                  {r.biggest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#AC2334]/[0.08] px-2 py-0.5 text-[11px] font-medium text-[#AC2334]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#AC2334]" />
                      <span className="whitespace-nowrap">biggest drop</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadFunnel;
