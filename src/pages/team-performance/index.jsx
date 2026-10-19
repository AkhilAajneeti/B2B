import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Icon from "../../components/AppIcon";
import TeamPerformanceTable from "./components/TeamPerformanceTable";
import { useTeamPerformance } from "./hooks/useTeamPerformance";
import { MIN_SAMPLE } from "./utils/qualification";

/**
 * Team Performance — Report 2 of the CRM Reports Module spec.
 *
 * Ranks reps on how many of their CONNECTED leads they qualify, counting every
 * lead that was ever qualified rather than only those sitting in a qualifying
 * status today. See utils/qualification.js for the rule and where the history
 * comes from.
 *
 * ADMIN ONLY, by `type`, not by role. Gated in two places, because either one
 * alone is not a gate:
 *   - the sidebar entry (presentation), and
 *   - the route itself via ProtectedRoute's `supAdminOnly` — without it the
 *     page is one typed URL away for anybody.
 */

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const Tile = ({ label, value, hint }) => (
  <div className="rounded-xl border border-border bg-card p-4" title={hint}>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      {value}
    </p>
  </div>
);

const TeamPerformance = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [project, setProject] = useState("");

  // Debounce-free on purpose: the dataset service dedupes in-flight requests
  // and caches per filter set, so typing re-reads cache rather than re-fetching.
  const filters = useMemo(() => ({ cProject: project.trim() }), [project]);

  const { rows, totals, historyAvailable, recordCount, isLoading, isFetching, isError } =
    useTeamPerformance({ filters, year });

  const rankedCount = rows.filter((r) => !r.lowSample).length;

  return (
    <>
      <Helmet>
        <title>Team Performance · AAJneeti CRM</title>
      </Helmet>

      <main className="lg:ml-64 pt-16">
        <div className="p-4 sm:p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                Team Performance
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ranked on qualification, counting every lead that was{" "}
                <span className="font-medium text-foreground">ever</span>{" "}
                qualified — not only those qualified today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Filter by project…"
                className="h-9 w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {isFetching && (
                <span className="text-xs text-muted-foreground">Updating…</span>
              )}
            </div>
          </div>

          {/* The honest-failure banner. If no record carries cStatusObj, every
              "ever" metric collapses to "currently" — the precise flaw this
              report exists to fix — and the numbers would look perfectly
              plausible while being wrong. Say so rather than show them bare. */}
          {!isLoading && recordCount > 0 && !historyAvailable && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <Icon name="AlertTriangle" size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">
                  No status history on these leads
                </p>
                <p className="mt-0.5">
                  None of the {recordCount} leads in this period carry a
                  status-change history, so Ever-Qualified is falling back to
                  each lead&apos;s current status. Leads that qualified and later
                  went cold are being under-counted.
                </p>
              </div>
            </div>
          )}

          {isError && (
            <div className="mb-5 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              Could not load the dataset. The report is showing whatever was
              cached from the last successful load.
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              label="Leads"
              value={totals?.leads ?? 0}
              hint="Base for every ratio"
            />
            <Tile
              label="Ever-Qualified"
              value={totals?.everQualified ?? 0}
              hint="Held a qualifying status at any point, even if closed today"
            />
            <Tile
              label="Qualified, then dropped"
              value={totals?.qualifiedThenDropped ?? 0}
              hint="Still counted as qualified. This is the weekly coaching list."
            />
            <Tile
              label="Reps ranked"
              value={`${rankedCount} / ${rows.length}`}
              hint={`Reps with at least ${MIN_SAMPLE} leads. Below that they are shown but not ranked.`}
            />
          </div>

          <TeamPerformanceTable
            rows={rows}
            totals={totals}
            isLoading={isLoading}
          />

          {/* Stated in the UI, not only in the code comments: a reader needs to
              know why the speed columns the spec asks for are not here. */}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Median first response, reached-within-5-minutes and overdue
            follow-ups are not shown. The CRM records which statuses a lead has
            passed through, but not when each change happened, so there is no
            honest way to measure response time yet — that needs a status-change
            log on the backend. Contact&nbsp;% is derived from statuses alone and
            so is a floor: a rep who spoke to a buyer without moving the status
            reads as not connected.
          </p>
        </div>
      </main>
    </>
  );
};

export default TeamPerformance;
