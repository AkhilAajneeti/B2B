import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import TablePagination from "../../reports/components/TablePagination";
import { MIN_SAMPLE } from "../utils/qualification";

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
  {
    key: "leads",
    label: "Leads",
    hint: "Leads assigned to this rep that were created in the selected period. Every other column is measured against these.",
  },
  {
    key: "connected",
    label: "Reached",
    hint: "How many of those leads the rep actually got through to at least once. Read from the lead's status — anything past New or Call Not Picked counts as reached — so with no call logs this is a floor, not an exact figure.",
  },
  {
    key: "everQualified",
    label: "Qualified",
    hint: "Leads that EVER showed real interest — Follow up, Interested, Site Visit Scheduled, Invitation Sent, Site Visit Done or Purchased — even if the lead is written off today.",
  },
  {
    key: "netQ",
    label: "Qualified of reached",
    hint: "Of the leads this rep actually spoke to, how many they qualified. Measured against Reached and not Leads on purpose: judging someone on numbers nobody could get through to punishes them for bad data, not bad selling.",
    // Rendered as "22 of 37" rather than 59.5% — the two counts say the same
    // thing, and a rep can check them against their own list in a way they
    // cannot check a percentage.
  },
  {
    key: "index",
    label: "Index",
    hint: "This rep compared with the rest of the team ON THE SAME PROJECTS. 1.00 is exactly team average, 1.20 is 20% better, 0.80 is 20% worse. Compared project by project so whoever works the harder campaign is not punished for it.",
  },
  {
    key: "qualifiedThenDropped",
    label: "Dropped",
    hint: "Leads this rep qualified and later lost. They still count as qualified — this is the weekly coaching list, not a penalty.",
  },
  {
    key: "closedWithoutReaching",
    label: "Never reached",
    hint: "Leads written off without a single conversation — straight from New or Call Not Picked to dead. Nobody ever got through, so this is a discipline and data-quality signal rather than a selling one.",
  },
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
                  <span
                    className={`inline-flex items-center gap-1 ${
                      col.hint
                        ? "cursor-help decoration-dotted underline-offset-4 hover:underline"
                        : ""
                    }`}
                  >
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
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                  {row.connected}
                </td>
                <td className="px-6 py-4 text-right text-[15px] font-semibold tabular-nums text-foreground">
                  {row.everQualified}
                </td>
                {/* Counts, not a percentage — "22 of 37" is checkable against
                    a rep's own list in a way that "59.5%" never is. */}
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                  {row.everQualified} <span className="text-muted-foreground/70">of</span> {row.connected}
                </td>
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
                  {totals.connected}
                </td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">{totals.everQualified}</td>
                <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                  {totals.everQualified} <span className="text-muted-foreground/70">of</span> {totals.connected}
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
