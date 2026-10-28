import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import TablePagination from "../../reports/components/TablePagination";
import Tooltip from "../../../components/ui/Tooltip";
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
  { key: "name", label: "TEAM MEMBER", align: "left", numeric: false },
  {
    key: "leads",
    label: "Total Leads",
    hint: "Total leads assigned to this team member that were created during the selected period."
  },
  {
    key: "connected",
    label: "Contacted",
    hint: "Leads where the team member appears to have made contact, based on the lead's current status. Actual calls are not tracked yet, so this count may be lower than the real number."
  },
  {
    key: "everQualified",
    label: "Interested Leads",
    hint: "Leads that showed interest at any point, even if they were later marked as lost or not interested."
  },
  {
    key: "netQ",
    label: "Interest Rate",
    hint: "Shows how many contacted leads became interested. For example, 5 of 10 means 5 interested leads out of 10 contacted leads."
  },
  {
    key: "index",
    label: "Team Comparison",
    hint: "Compares this team member's results with the team average on the same projects. 1.00 means average, 1.20 means 20% above average, and 0.80 means 20% below average."
  },
  {
    key: "qualifiedThenDropped",
    label: "Interested, Then Lost",
    hint: "Leads that showed interest but were later marked as lost. Use this number to identify leads that may need follow-up."
  },
  {
    key: "closedWithoutReaching",
    label: "No Contact Made",
    hint: "Leads marked as lost without reaching a contact status. This helps identify leads that may have been closed before contact was established."
  },
  {
    key: "siteVisitsDone",
    label: "Site Visits Completed",
    hint: "Leads created during the selected period that reached the Site Visit Done status. This is based on when the lead was created, not when the visit happened."
  },
];

/**
 * Card tint and badge, from the rep's team-comparison index.
 *
 * Same construction as the leads list's mobile cards — a soft gradient wash on
 * the card and a matching pill — so the two screens read as one product. The
 * hues carry the same meaning they do in the desktop table's Index column:
 * green ahead of the team, red behind, neutral in the middle.
 *
 * Colour is never the only signal: the pill says the number, or "Not ranked".
 */
const perfTier = (row) => {
  if (row.lowSample || row.index == null) {
    return {
      card: "bg-gradient-to-br from-muted/60 to-background border-border",
      badge: "bg-muted text-muted-foreground",
      label: "Not ranked",
    };
  }
  if (row.index >= 1.15) {
    return {
      card: "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      badge: "bg-emerald-100 text-emerald-700",
      label: `${row.index.toFixed(2)} ↑`,
    };
  }
  if (row.index <= 0.85) {
    return {
      card: "bg-gradient-to-br from-rose-50/70 to-background border-rose-100",
      badge: "bg-rose-100 text-rose-700",
      label: `${row.index.toFixed(2)} ↓`,
    };
  }
  return {
    card: "bg-gradient-to-br from-blue-50/70 to-background border-blue-100",
    badge: "bg-blue-100 text-blue-700",
    label: row.index.toFixed(2),
  };
};

/**
 * One rep, as a card. Phones only — see the note on the breakpoint below.
 *
 * Collapsed it carries the three numbers worth scanning a list for (leads,
 * interested, comparison); the remaining six are a tap away. The alternative
 * was the table in a horizontal scroller, where the columns that matter are
 * off-screen and the rep's name scrolls away with them.
 *
 * Only one card is open at a time, so the list never grows past a screen or
 * two and the thing you just opened is always in view.
 */
const MobileRow = ({ row, open, onToggle }) => {
  const details = [
    { label: "Total leads", value: row.leads },
    { label: "Contacted", value: row.connected },
    {
      label: "Interest rate",
      value: (
        <>
          {row.everQualified}{" "}
          <span className="text-muted-foreground/70">of</span> {row.connected}
        </>
      ),
    },
    { label: "Interested, then lost", value: row.qualifiedThenDropped },
    { label: "No contact made", value: row.closedWithoutReaching },
    { label: "Site visits completed", value: row.siteVisitsDone },
  ];

  const tier = perfTier(row);

  return (
    <div
      className={`mx-3 my-2 rounded-2xl border p-4 transition-all duration-200 active:scale-[0.99] ${tier.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold capitalize text-foreground">
          {row.name}
        </h3>

        {/* The comparison index as the badge — the one number that says how
            this rep is doing, in the same place the lead card puts status. */}
        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium ${tier.badge}`}
        >
          {tier.label}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="Users" size={12} />
            <span>{row.leads} leads</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="PhoneCall" size={12} />
            <span>{row.connected} contacted</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="ShieldCheck" size={12} />
            <span>
              <span className="font-semibold text-foreground">
                {row.everQualified}
              </span>{" "}
              interested
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1 rounded-full bg-background/70 px-3 py-2 text-xs font-medium text-primary transition-all duration-150 hover:bg-primary/10 active:scale-95"
        >
          {open ? "Less" : "More"}
          <Icon
            name="ChevronDown"
            size={14}
            className={`transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {d.label}
                </dt>
                <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-foreground">
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>

          {/* The "not ranked" badge needs explaining somewhere a phone can
              read it: there is no hover to put it behind. */}
          {row.lowSample && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Fewer than {MIN_SAMPLE} leads this period — shown, but not ranked
              against the team.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

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
  // Mobile accordion. One id, not a set — opening a card closes the last one.
  const [openId, setOpenId] = useState(null);

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

  // An open card on page 1 would otherwise stay open against whichever rep
  // lands in that position on page 2.
  useEffect(() => {
    setOpenId(null);
  }, [page, sort.key, sort.dir]);

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
      {/* Phones and small tablets get the accordion; the table returns at lg,
          where all nine columns fit without a horizontal scroller. */}
      <div className="py-1 lg:hidden">
        {paged.map((row) => (
          <MobileRow
            key={row.id}
            row={row}
            open={openId === row.id}
            onToggle={() => setOpenId((id) => (id === row.id ? null : row.id))}
          />
        ))}

        {totals && (
          <div className="mx-3 my-2 flex items-center justify-between rounded-2xl border border-border bg-muted/50 px-4 py-3.5">
            <span className="text-[15px] font-bold text-foreground">Team</span>
            <span className="text-xs text-muted-foreground">
              {totals.leads} leads ·{" "}
              <span className="font-semibold text-foreground">
                {totals.everQualified}
              </span>{" "}
              interested · {totals.siteVisitsDone} visits
            </span>
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggle(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground ${col.align === "left" ? "text-left" : "text-right"
                    }`}
                >
                  <Tooltip title={col.label} text={col.hint}>
                    <span
                      className={
                        col.hint
                          ? "cursor-pointer border-b border-dotted border-muted-foreground/50"
                          : ""
                      }
                    >
                      {col.label}
                    </span>
                    {sort.key === col.key && (
                      <Icon
                        name={sort.dir === "asc" ? "ChevronUp" : "ChevronDown"}
                        size={12}
                      />
                    )}
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paged.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-border/60 transition-colors even:bg-muted/[0.18] last:border-b-0 hover:bg-sky-50 ${row.lowSample ? "opacity-60" : ""
                  }`}
              >
                <td className=" whitespace-nowrap px-6 py-4 text-left text-[15px] font-semibold text-foreground">
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
