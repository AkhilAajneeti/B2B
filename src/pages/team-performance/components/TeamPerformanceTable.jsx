import React, { useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import { MIN_SAMPLE } from "../utils/qualification";

const pct = (n) => `${(n ?? 0).toFixed(1)}%`;

/**
 * Columns.
 *
 * The spec's table also carries Median first response, Reached-within-5-min %
 * and Overdue follow-ups. Those are deliberately ABSENT rather than present and
 * empty: `cStatusObj` gives us which statuses a lead passed through but not
 * when, so there is no honest way to compute a response time today. An empty
 * column reads as a broken report; a missing one reads as a later phase.
 */
const COLUMNS = [
  { key: "name", label: "Rep", align: "left", numeric: false },
  { key: "leads", label: "Leads", hint: "Base for every ratio" },
  { key: "contact", label: "Contact %", hint: "Reached at least once. Status-derived, so this is a floor", format: pct },
  { key: "everQualified", label: "Ever-Qualified", hint: "Held a qualifying status at any point, even if closed now" },
  { key: "netQ", label: "Net Q%", hint: "Ever-Qualified / Connected — conversation skill", format: pct },
  { key: "index", label: "Index", hint: "Rep's Net Q% vs the team's, on the same projects. 1.20 = 20% better than peers" },
  { key: "qualifiedThenDropped", label: "Dropped", hint: "Qualified, then went cold — the coaching list" },
  { key: "closedWithoutReaching", label: "Never reached", hint: "Closed having never had a conversation — a discipline flag" },
  { key: "siteVisitsDone", label: "Visits", hint: "Site visits done" },
];

const indexTone = (index) => {
  if (index == null) return "text-muted-foreground";
  if (index >= 1.15) return "text-emerald-600 dark:text-emerald-400";
  if (index <= 0.85) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
};

const TeamPerformanceTable = ({ rows = [], totals, isLoading }) => {
  const [sort, setSort] = useState({ key: "index", dir: "desc" });

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      // Low-sample reps stay pinned to the bottom whatever the sort, so the
      // top of the table is never a rep with four leads and a lucky ratio.
      if (a.lowSample !== b.lowSample) return a.lowSample ? 1 : -1;
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "string" || typeof bv === "string") {
        return sort.dir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      const an = av ?? -1;
      const bn = bv ?? -1;
      return sort.dir === "asc" ? an - bn : bn - an;
    });
    return copy;
  }, [rows, sort]);

  const toggle = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );

  if (isLoading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Loading team performance…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No leads in this period.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  title={col.hint}
                  onClick={() => toggle(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground ${
                    col.align === "left" ? "text-left" : "text-right"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sort.key === col.key && (
                      <Icon
                        name={sort.dir === "asc" ? "ChevronUp" : "ChevronDown"}
                        size={12}
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-border last:border-0 hover:bg-muted/30 ${
                  row.lowSample ? "opacity-60" : ""
                }`}
              >
                <td className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">
                  {row.name}
                  {row.lowSample && (
                    <span
                      title={`Fewer than ${MIN_SAMPLE} leads — shown but not ranked, because a percentage on this few leads is noise`}
                      className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      low sample
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.leads}</td>
                <td className="px-4 py-3 text-right tabular-nums">{pct(row.contact)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">
                  {row.everQualified}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{pct(row.netQ)}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-semibold ${indexTone(row.lowSample ? null : row.index)}`}>
                  {row.lowSample || row.index == null ? "—" : row.index.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.qualifiedThenDropped}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.closedWithoutReaching}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.siteVisitsDone}</td>
              </tr>
            ))}
          </tbody>

          {totals && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                <td className="px-4 py-3 text-left">Team</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.leads}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pct(totals.leads ? (totals.connected / totals.leads) * 100 : 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.everQualified}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {pct(totals.connected ? (totals.everQualified / totals.connected) * 100 : 0)}
                </td>
                {/* The team is its own baseline, so its index is 1.00 by
                    definition — printing it would imply a comparison. */}
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.qualifiedThenDropped}</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.closedWithoutReaching}</td>
                <td className="px-4 py-3 text-right tabular-nums">{totals.siteVisitsDone}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default TeamPerformanceTable;
