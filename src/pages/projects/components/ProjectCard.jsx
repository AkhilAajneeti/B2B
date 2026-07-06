import React from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import Icon from "../../../components/AppIcon";
import { fetchLeadsCount } from "services/leads.service";
import { fetchProjectsById } from "services/projects.service";

/* Thumbnail gradients, rotated per card (projects have no image field yet). */
const GRADIENTS = [
  "linear-gradient(135deg,#7E1524,#B5533A)",
  "linear-gradient(135deg,#264F4A,#5B9187)",
  "linear-gradient(135deg,#7A5A22,#C79A4A)",
  "linear-gradient(135deg,#4A3550,#8B6FA0)",
  "linear-gradient(135deg,#2C4A6E,#6C93BE)",
  "linear-gradient(135deg,#5C6B2A,#9CB05A)",
];

const AVATAR_COLORS = [
  "bg-[#6E1420]",
  "bg-teal-600",
  "bg-amber-600",
  "bg-indigo-600",
  "bg-rose-600",
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

const ProjectCard = ({ project, index = 0, onOpen }) => {
  // Leads reference a project by its label in `cProject`. Use the clean
  // projectNomen (falling back to name) with a "contains" match, so it works
  // whether cProject stores the short label ("GangaCounty") or the full
  // concatenated name ("ShashankVirtualRealtyGangaCounty").
  const projectKey =
    project.projectNomen && project.projectNomen !== "Default"
      ? project.projectNomen
      : project.name;

  // `cProject` spacing is inconsistent across leads ("GangaCounty" vs "Ganga
  // County"), and LIKE can't ignore spaces — so match both the raw and spaced
  // variants and sum. Each lead's cProject is one string, so it matches at
  // most one variant: no double-counting.
  const keys = [...new Set([projectKey, humanize(projectKey)].filter(Boolean))];

  const totalQ = useQueries({
    queries: keys.map((k) => ({
      queryKey: ["project-leads-total", project.id, k],
      queryFn: () =>
        fetchLeadsCount([{ type: "contains", attribute: "cProject", value: k }]),
      enabled: !!k,
      staleTime: 1000 * 60 * 5,
    })),
  });
  const todayQ = useQueries({
    queries: keys.map((k) => ({
      queryKey: ["project-leads-today", project.id, k],
      queryFn: () =>
        fetchLeadsCount([
          { type: "contains", attribute: "cProject", value: k },
          { type: "today", attribute: "createdAt" },
        ]),
      enabled: !!k,
      staleTime: 1000 * 60 * 5,
    })),
  });

  const loadingTotal = totalQ.some((q) => q.isLoading);
  const total = totalQ.reduce((s, q) => s + (q.data || 0), 0);
  const today = todayQ.reduce((s, q) => s + (q.data || 0), 0);

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
      : null;

  // No project-level live/paused field exists — derive from activity: a
  // campaign with leads reads as Live, one with none as Paused.
  const paused = !loadingTotal && total === 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Thumbnail */}
      <div
        className="relative flex h-32 items-end p-3"
        style={{ backgroundImage: GRADIENTS[index % GRADIENTS.length] }}
      >
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
            paused ? "text-slate-500" : "text-emerald-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${paused ? "bg-slate-400" : "bg-emerald-500"}`}
          />
          {paused ? "Paused" : "Live"}
        </span>
        {project.address && (
          <span className="flex items-center gap-1 text-xs font-semibold text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
            <Icon name="MapPin" size={13} />
            {project.address}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pt-4">
        <h3
          className="truncate text-[17px] font-bold tracking-tight text-foreground"
          title={title}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="mt-0.5 truncate text-xs text-muted-foreground"
            title={subtitle}
          >
            {subtitle}
          </p>
        )}
        {project.parentName && (
          <p className="mt-2 text-sm font-semibold text-[#6E1420]">{project.parentName}</p>
        )}

        {/* Lead stats */}
        <div className="mt-3 flex items-end gap-6">
          <div>
            <div className="text-2xl font-bold leading-none text-foreground">
              {loadingTotal ? "—" : total}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total leads
            </div>
          </div>
          <div>
            <div className="text-sm font-bold leading-none text-emerald-600">
              {today > 0 ? `+${today}` : "0"}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Today
            </div>
          </div>
        </div>

        {/* Agents */}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center">
            {uniqueAgents.slice(0, 4).map((a, i) => (
              <span
                key={i}
                className={`-ml-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-white first:ml-0 ${
                  AVATAR_COLORS[i % AVATAR_COLORS.length]
                }`}
                title={a}
              >
                {initials(a)}
              </span>
            ))}
            {uniqueAgents.length === 0 && (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {uniqueAgents.length} agent{uniqueAgents.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex gap-2 border-t border-border p-3">
        <button
          onClick={() => onOpen(project)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6E1420] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#57101a]"
        >
          <Icon name="ArrowUpRight" size={15} />
          Open
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
