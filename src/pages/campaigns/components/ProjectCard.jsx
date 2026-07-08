import React from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "../../../components/AppIcon";
import { fetchLeadsCount } from "services/leads.service";
import { fetchProjectsById } from "services/projects.service";
import { getLastActivityLabel } from "pages/pipeline/utils/dateHelpers";

/* Per-card accent pair, rotated by index. `tint` is the hover border colour,
   `glow` the halo shadow. Index 0 is the brand maroon. */
const ACCENTS = [
  { from: "#7E1524", to: "#B5533A", tint: "rgba(126,21,36,0.28)", glow: "rgba(126,21,36,0.22)" },
  { from: "#264F4A", to: "#5B9187", tint: "rgba(38,79,74,0.28)", glow: "rgba(38,79,74,0.22)" },
  { from: "#7A5A22", to: "#C79A4A", tint: "rgba(122,90,34,0.28)", glow: "rgba(122,90,34,0.22)" },
  { from: "#4A3550", to: "#8B6FA0", tint: "rgba(74,53,80,0.28)", glow: "rgba(74,53,80,0.22)" },
  { from: "#2C4A6E", to: "#6C93BE", tint: "rgba(44,74,110,0.28)", glow: "rgba(44,74,110,0.22)" },
  { from: "#5C6B2A", to: "#9CB05A", tint: "rgba(92,107,42,0.28)", glow: "rgba(92,107,42,0.22)" },
];

/* Solid fills for the avatar stack — deliberately not the accent pairs, so the
   team reads as its own visual system rather than more card chrome. */
const AVATAR_COLORS = [
  "#6E1420",
  "#0F766E",
  "#B45309",
  "#4338CA",
  "#BE123C",
];

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

// Split run-together PascalCase / camelCase labels into words for display.
// "GangaCounty" → "Ganga County"; "ShashankVirtualRealty" → "Shashank Virtual
// Realty". Already-spaced names pass through unchanged.
const humanize = (s = "") =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

const MAX_AVATARS = 4;

const ProjectCard = ({ project, index = 0, onOpen }) => {
  const accent = ACCENTS[index % ACCENTS.length];

  // Lead↔campaign linkage is inconsistent: some leads carry the clean label in
  // `cProjectNomen` (with a messy `cProject`), others have it in `cProject`
  // (with a null `cProjectNomen`). So match EITHER — cProjectNomen equals OR
  // cProject contains the projectNomen. For "Default" projectNomen (no real
  // per-campaign label) scope by `cClientNomen` (client-level) instead.
  const hasNomen = project.projectNomen && project.projectNomen !== "Default";
  const countFilter = hasNomen
    ? [
        {
          type: "or",
          value: [
            { type: "equals", attribute: "cProjectNomen", value: project.projectNomen },
            { type: "contains", attribute: "cProject", value: project.projectNomen },
          ],
        },
      ]
    : project.clientNomen
      ? [{ type: "equals", attribute: "cClientNomen", value: project.clientNomen }]
      : [{ type: "contains", attribute: "cProject", value: project.name }];

  const filterKey = JSON.stringify(countFilter);

  const { data: total = 0, isLoading: loadingTotal } = useQuery({
    queryKey: ["project-leads-total", project.id, filterKey],
    queryFn: () => fetchLeadsCount(countFilter),
    staleTime: 1000 * 60 * 5,
  });
  const { data: today = 0 } = useQuery({
    queryKey: ["project-leads-today", project.id, filterKey],
    queryFn: () =>
      fetchLeadsCount([...countFilter, { type: "today", attribute: "createdAt" }]),
    staleTime: 1000 * 60 * 5,
  });

  // The list endpoint doesn't return collaboratorsNames, so fetch the project
  // detail (cached) when the list item is missing it, to show the team.
  const { data: detail } = useQuery({
    queryKey: ["project-collaborators", project.id],
    queryFn: () => fetchProjectsById(project.id),
    enabled: !project.collaboratorsNames && !!project.id,
    staleTime: 1000 * 60 * 10,
  });
  const collaboratorsNames =
    project.collaboratorsNames || detail?.collaboratorsNames || {};

  // Project team = collaborators (projects use collaboratorsNames, not an
  // assigned user).
  const uniqueAgents = [
    ...new Set(Object.values(collaboratorsNames).filter(Boolean)),
  ];
  const shownAgents = uniqueAgents.slice(0, MAX_AVATARS);
  const overflow = uniqueAgents.length - shownAgents.length;

  // Title = projectNomen (the short label); the full name goes underneath.
  // Falls back to name when projectNomen is empty or the "Default" placeholder.
  const rawTitle =
    project.projectNomen && project.projectNomen !== "Default"
      ? project.projectNomen
      : project.name;
  const title = humanize(rawTitle);
  const subtitle =
    project.clientNomen && project.clientNomen !== rawTitle
      ? humanize(project.clientNomen)
      : "Campaign";

  // "Active" the moment a lead lands today; otherwise the campaign is warm but
  // idle. There is no `status` field on Project that the UI reads today.
  const isActive = today > 0;

  // Momentum = share of the campaign's lifetime leads that arrived today. Both
  // operands are real counts, so this is not illustrative. It's naturally tiny
  // on mature campaigns (2/500 = 0.4%), so the *bar* floors at 4% to stay
  // visible while the *label* prints the true figure.
  const momentum = total > 0 ? (today / total) * 100 : 0;
  const momentumBar = momentum > 0 ? Math.min(100, Math.max(4, momentum)) : 0;
  const momentumLabel =
    momentum > 0 && momentum < 10 ? momentum.toFixed(1) : Math.round(momentum);

  // EspoCRM stamps `modifiedAt` on every entity; the list payload may omit it,
  // in which case the cached detail fetch above fills it in. `createdAt` is the
  // last resort, and getLastActivityLabel renders "No activity" for null.
  const lastActivity = getLastActivityLabel(
    project.modifiedAt || detail?.modifiedAt || project.createdAt,
  );

  const accentVars = {
    "--accent-from": accent.from,
    "--accent-to": accent.to,
    "--accent-tint": accent.tint,
    "--accent-glow": accent.glow,
  };

  return (
    <article
      style={accentVars}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[rgba(20,20,30,0.08)] bg-card shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_6px_rgba(16,24,40,.05)] transition-all duration-300 ease-premium hover:-translate-y-1 hover:border-[color:var(--accent-tint)] hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_18px_40px_-12px_var(--accent-glow)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {/* 3px accent rule across the top */}
      <div
        aria-hidden="true"
        className="h-[3px] w-full bg-gradient-to-r from-[color:var(--accent-from)] to-[color:var(--accent-to)]"
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* ── Header ─────────────────────────────────────────────── */}
        <header className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[color:var(--accent-from)] to-[color:var(--accent-to)] text-[13px] font-bold tracking-tight text-white shadow-[0_2px_6px_rgba(16,24,40,.12)]"
          >
            {initials(title)}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-[14.5px] font-bold leading-tight tracking-[-0.01em] text-foreground"
              title={title}
            >
              {title}
            </h3>
            <p
              className="mt-0.5 truncate text-[11.5px] leading-tight text-muted-foreground"
              title={subtitle}
            >
              {subtitle}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] ${
                isActive
                  ? "border-emerald-600/20 bg-emerald-50 text-emerald-700"
                  : "border-slate-300/60 bg-slate-50 text-slate-500"
              }`}
            >
              <span className="relative grid h-1.5 w-1.5 place-items-center">
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute h-full w-full rounded-full bg-emerald-500 animate-pulse-ring motion-reduce:hidden"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
              </span>
              {isActive ? "Active" : "Steady"}
            </span>
            <span className="text-[10px] leading-none text-muted-foreground">
              {lastActivity}
            </span>
          </div>
        </header>

        {/* Address / parent survive the redesign — the old thumbnail that
            carried them is gone. Both are optional on Project. */}
        {(project.address || project.parentName) && (
          <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {project.address && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Icon name="MapPin" size={11} className="shrink-0" />
                <span className="truncate">{project.address}</span>
              </span>
            )}
            {project.parentName && (
              <span className="truncate font-semibold text-[color:var(--accent-from)]">
                {project.parentName}
              </span>
            )}
          </div>
        )}

        {/* ── Metrics panel ──────────────────────────────────────── */}
        <div className="rounded-[14px] border border-[rgba(20,20,30,0.07)] bg-gradient-to-b from-slate-50/80 to-white p-3.5">
          <dl className="flex items-stretch">
            <div className="flex-1 pr-3.5">
              <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                Total Leads
              </dt>
              <dd className="mt-1 text-[22px] font-bold leading-none tabular-nums tracking-tight text-foreground">
                {loadingTotal ? "—" : total.toLocaleString("en-IN")}
              </dd>
            </div>

            <div aria-hidden="true" className="w-px shrink-0 bg-[rgba(20,20,30,0.08)]" />

            <div className="flex-1 pl-3.5">
              <dt className="text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                New Today
              </dt>
              <dd
                className={`mt-1 flex items-center gap-1 text-[22px] font-bold leading-none tabular-nums tracking-tight ${
                  isActive ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {today > 0 ? `+${today}` : "0"}
                {isActive && (
                  <Icon
                    name="TrendingUp"
                    size={13}
                    className="mb-px shrink-0"
                    aria-hidden="true"
                  />
                )}
              </dd>
            </div>
          </dl>

          {/* Momentum */}
          <div className="mt-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-[0.09em] text-muted-foreground">
                Momentum
              </span>
              <span className="text-[10.5px] font-bold tabular-nums text-foreground">
                {momentumLabel}%
              </span>
            </div>
            <div
              className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(20,20,30,0.07)]"
              role="progressbar"
              aria-valuenow={Math.round(momentum)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Momentum: ${momentumLabel}% of leads arrived today`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent-from)] to-[color:var(--accent-to)] transition-[width] duration-700 ease-premium motion-reduce:transition-none"
                style={{ width: `${momentumBar}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="mt-auto flex items-center justify-between gap-3 pt-1">
          {uniqueAgents.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">Unassigned</span>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex transition-transform duration-300 ease-premium group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                {shownAgents.map((a) => (
                  <span
                    key={a}
                    title={a}
                    style={{
                      backgroundColor:
                        AVATAR_COLORS[
                          [...a].reduce((h, c) => h + c.charCodeAt(0), 0) %
                            AVATAR_COLORS.length
                        ],
                    }}
                    className="-ml-2 grid h-7 w-7 place-items-center rounded-full text-[9.5px] font-bold text-white ring-2 ring-card first:ml-0"
                  >
                    {initials(a)}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="-ml-2 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-[9.5px] font-bold text-slate-600 ring-2 ring-card">
                    +{overflow}
                  </span>
                )}
              </div>
              <span className="truncate text-[10.5px] font-semibold text-muted-foreground">
                {uniqueAgents.length} member{uniqueAgents.length === 1 ? "" : "s"}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onOpen(project)}
            aria-label={`Open ${title}`}
            className="group/cta relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[color:var(--accent-from)] to-[color:var(--accent-to)] py-1.5 pl-4 pr-1.5 text-[12px] font-bold text-white transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-6px_var(--accent-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-to)] focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {/* diagonal light sweep */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-8 w-8 -skew-x-12 bg-white/25 opacity-0 transition-transform duration-700 ease-premium group-hover/cta:translate-x-[220px] group-hover/cta:opacity-100 motion-reduce:hidden"
            />
            <span className="relative">Open</span>
            <span
              aria-hidden="true"
              className="relative grid h-5 w-5 place-items-center rounded-full bg-white/20 transition-transform duration-300 ease-premium group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
            >
              <Icon name="ArrowRight" size={12} />
            </span>
          </button>
        </footer>
      </div>
    </article>
  );
};

export default ProjectCard;
