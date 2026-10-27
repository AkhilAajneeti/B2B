import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import TablePagination from "../../reports/components/TablePagination";
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
  {
    key: "siteVisitsDone",
    label: "Visits",
    // Scope matters here and it is easy to misread. Every column on this table
    // counts LEADS CREATED in the selected period — the dataset filters on
    // createdAt — so this is "leads from this month that reached Visit Done",
    // not "visits that happened this month". A visit done today on a lead
    // created in September is not counted, which is why this number reads
    // lower than a status filter on the Leads page.
    hint: "Leads from this period that reached Site Visit Done. Counts the lead's creation month, not the visit date.",
  },
];

const indexTone = (index) => {
  if (index == null) return "text-muted-foreground";
  if (index >= 1.15) return "text-emerald-600 dark:text-emerald-400";
  if (index <= 0.85) return "text-rose-600 dark:text-rose-400";
  return "text-foreground";
};

const TeamPerformanceTable = ({ rows = [], totals, isLoading }) => {
  const [sort, setSort] = useState({ key: "index", dir: "desc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

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

  // Paginate AFTER sorting, never before — slicing first would sort only the
  // visible page and the ranking would change as you clicked through.
  const paged = useMemo(
    () => sorted.slice((page - 1) * perPage, page * perPage),
    [sorted, page, perPage],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

  // Any change to the ordering or the underlying rows invalidates the current
  // page number — page 3 of a re-sorted table shows unrelated reps, and page 3
  // of a shorter result set shows nothing at all.
  useEffect(() => {
    setPage(1);
  }, [sort.key, sort.dir, perPage, rows.length]);

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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  title={col.hint}
                  onClick={() => toggle(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground ${
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
            {paged.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-border/60 transition-colors even:bg-muted/[0.18] last:border-b-0 hover:bg-sky-50 ${
                  row.lowSample ? "opacity-60" : ""
                }`}
              >
                <td className="whitespace-nowrap px-6 py-4 text-left text-[15px] font-semibold text-foreground">
                  {/* The "LOW SAMPLE" badge is gone — it shouted on every row
                      it touched. The signal is kept more quietly: the row is
                      dimmed, it sorts last, and its Index reads "—" with the
                      reason on hover. */}
                  {row.name}
                </td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{row.leads}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{pct(row.contact)}</td>
                <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums text-foreground">
                  {row.everQualified}
                </td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{pct(row.netQ)}</td>
                <td className={`px-6 py-4 text-right text-[15px] tabular-nums font-semibold ${indexTone(row.lowSample ? null : row.index)}`}>
                  {row.lowSample || row.index == null ? "—" : row.index.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{row.qualifiedThenDropped}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{row.closedWithoutReaching}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{row.siteVisitsDone}</td>
              </tr>
            ))}
          </tbody>

          {/* Totals are for the WHOLE team, not the visible page. A footer
              that re-totalled per page would read as the team's numbers while
              silently meaning "these 20 reps", which is worse than no footer. */}
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50 text-[15px] font-bold">
                <td className="px-6 py-4 text-left">Team</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.leads}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                  {pct(totals.leads ? (totals.connected / totals.leads) * 100 : 0)}
                </td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.everQualified}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                  {pct(totals.connected ? (totals.everQualified / totals.connected) * 100 : 0)}
                </td>
                {/* The team is its own baseline, so its index is 1.00 by
                    definition — printing it would imply a comparison. */}
                <td className="px-6 py-4 text-right text-muted-foreground">—</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.qualifiedThenDropped}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.closedWithoutReaching}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.siteVisitsDone}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {sorted.length > perPage && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sorted.length}
          itemsPerPage={perPage}
          onPageChange={setPage}
          onItemsPerPageChange={(n) => setPerPage(Number(n))}
        />
      )}
    </div>
  );
};

export default TeamPerformanceTable;
