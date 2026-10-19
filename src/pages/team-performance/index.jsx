import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import Icon from "../../components/AppIcon";
import TeamPerformanceTable from "./components/TeamPerformanceTable";
import { useTeams, useTeamUsers } from "hooks/useTeams";
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

/**
 * Reporting period.
 *
 * This is the lever that controls how much data crosses the wire, and it
 * defaults to the current MONTH rather than the year. The dataset service pulls
 * every lead in the window so the aggregates can be computed, so a year-wide
 * default meant ~12x the rows for a report most people read month to month.
 *
 * Why the window and not a paged fetch: see the note on the fetch in
 * hooks/useTeamPerformance.js. Narrowing the window is the only way to load
 * less without making the numbers wrong.
 */
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d, endOfDay = false) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${
    endOfDay ? "23:59:59" : "00:00:00"
  }`;

const monthRange = (offset = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return [fmt(start), fmt(end, true)];
};

// Month windows only, deliberately. A quarter or a year runs past the dataset
// service's 5,000-lead cap at this volume, and over that cap the aggregates are
// computed on a TRUNCATED set with nothing on screen saying so. Wider windows
// come back when the backend can aggregate, not before.
const PERIODS = [
  { key: "thisMonth", label: "This month", range: () => monthRange(0) },
  { key: "lastMonth", label: "Last month", range: () => monthRange(-1) },
];

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
  const [periodKey, setPeriodKey] = useState("thisMonth");
  const [project, setProject] = useState("");
  const [team, setTeam] = useState("");

  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[0];

  // TEAM FILTER. Lead has no native team attribute, so "filter by team" means
  // "assigned to anyone on that team": the selected team's users are resolved
  // to ids and applied as assignedUserId IN [...]. Same approach as the Reports
  // and Deals pages, so all three agree on what a team contains.
  const { data: teamsData } = useTeams();
  const { data: teamUsersData, isSuccess: teamUsersLoaded } = useTeamUsers(team);

  // null = "not known yet", [] = "this team genuinely has no users".
  // The distinction matters: `|| []` while the request is still in flight would
  // read as an empty team and the query would resolve to "match nothing",
  // flashing an empty report before the real one arrives.
  const teamUserIds = useMemo(() => {
    if (!team) return null;
    if (!teamUsersLoaded) return null;
    return (teamUsersData?.list || []).map((u) => u.id);
  }, [team, teamUsersLoaded, teamUsersData]);

  const teamOptions = (teamsData?.list || []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  // Debounce-free on purpose: the dataset service dedupes in-flight requests
  // and caches per filter set, so typing re-reads cache rather than re-fetching.
  const { filters, year } = useMemo(() => {
    const [startDate, endDate] = period.range();
    return {
      filters: {
        cProject: project.trim(),
        // Only present once the team's users are known — see teamUserIds above.
        ...(team && teamUserIds ? { _teamUserIds: teamUserIds } : {}),
        // `between` on createdAt — the service falls back to a whole-year
        // window when no explicit range is given, which is what we are
        // avoiding here.
        dateFilter: "between",
        startDate,
        endDate,
      },
      // Only used to namespace the cache key; the range above is what the
      // query actually filters on.
      year: Number(startDate.slice(0, 4)),
    };
  }, [period, project, team, teamUserIds]);

  // Hold the dataset request until the team resolves. Firing it early would
  // fetch the WHOLE team's leads unscoped, then immediately refetch scoped —
  // a wasted full pull, and a second of wrong numbers on screen.
  const { rows, totals, historyAvailable, recordCount, isLoading, isFetching, isError } =
    useTeamPerformance({
      filters,
      year,
      enabled: !team || teamUserIds !== null,
    });

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
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">All teams</option>
                {teamOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {PERIODS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
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
              hint={`Base for every ratio · ${period.label.toLowerCase()}`}
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
