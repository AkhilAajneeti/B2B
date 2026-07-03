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
      widthPct: Math.max((count / max) * 100, 5),
    };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          How your leads are moving
        </h3>
        <span className="text-sm text-muted-foreground">All open leads · by stage</span>
      </div>

      <div className={`space-y-2.5 transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 sm:gap-4">
            {/* Stage label */}
            <div className="w-20 shrink-0 text-right sm:w-28">
              <p className="text-sm font-semibold leading-tight text-foreground">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.sub}</p>
            </div>

            {/* Bar — centered within its track to form a true funnel shape */}
            <div className="flex min-w-0 flex-1 justify-center">
              <div
                className={`flex h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold shadow-sm transition-[width] duration-700 ease-out ${r.grad} ${r.text}`}
                style={{ width: `${r.widthPct}%`, minWidth: "2.75rem" }}
              >
                {r.count}
              </div>
            </div>

            {/* Conversion + biggest-drop badge */}
            <div className="w-20 shrink-0 sm:w-28">
              {r.conv !== null && (
                <div className="flex flex-col items-start gap-1.5">
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
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AC2334]" />
                      biggest drop
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
