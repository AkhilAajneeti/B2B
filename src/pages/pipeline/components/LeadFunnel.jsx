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
const STAGES = [
  { key: "new", label: "New lead", sub: "uncontacted", color: "#7d8aa3", statuses: ["New"] },
  {
    key: "contacted",
    label: "Contacted",
    sub: "reached out",
    color: "#6f7ca6",
    statuses: ["Follow up", "Call Later", "Call Not Connecting", "Call Not Picked"],
  },
  { key: "interested", label: "Interested", sub: "qualified", color: "#8b6a83", statuses: ["Interested", "Low Interest"] },
  {
    key: "sitevisit",
    label: "Site visit",
    sub: "property shown",
    color: "#9c5560",
    statuses: ["Site Visit Scheduled", "Site Visit Done"],
  },
  { key: "negotiation", label: "Negotiation", sub: "discussing terms", color: "#8e3947", statuses: ["QDTD", "Low Budget"] },
  { key: "won", label: "Closed · won", sub: "booked", color: "#6d1420", statuses: ["Purchased", "Converted", "Booked"] },
];

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
                className="flex h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold text-white shadow-sm transition-[width] duration-700 ease-out"
                style={{ width: `${r.widthPct}%`, minWidth: "2.75rem", backgroundColor: r.color }}
              >
                {r.count}
              </div>
            </div>

            {/* Conversion + biggest-drop badge */}
            <div className="w-20 shrink-0 sm:w-28">
              {r.conv !== null && (
                <div className="flex flex-col items-start gap-1">
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-medium ${
                      r.biggest ? "text-[#AC2334]" : "text-muted-foreground"
                    }`}
                  >
                    <Icon name="ArrowDown" size={13} />
                    {r.conv}%
                  </span>
                  {r.biggest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#AC2334]/10 px-2 py-0.5 text-[11px] font-medium text-[#AC2334]">
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
