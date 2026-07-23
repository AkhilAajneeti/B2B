import React from "react";
import { useQueries } from "@tanstack/react-query";
import Icon from "../../../components/AppIcon";
import { fetchLeadsCount } from "services/leads.service";
import { projectsLeadScope } from "../utils/leadScope";

/**
 * ProjectKpis — the top KPI row. `totalProjects` comes from the project list;
 * the lead-based numbers are counted live. "Avg response" from the mockup needs
 * response-time tracking the backend doesn't have yet, so it's replaced by a
 * real "Total leads" metric for now.
 *
 * The lead counts follow the campaign filter. They used to be company-wide with
 * static query keys, so filtering to 2 campaigns holding 103 leads still showed
 * "Total Leads 7743" (every lead in the database) beside a correctly-filtered
 * "Projects 2" — one filtered number next to three global ones.
 *
 * Props:
 *   totalProjects   — filtered project count (drives the Projects card)
 *   scopeProjects   — ALL filtered campaigns (not just the current page), used
 *                     to scope the lead counts. Pass null/undefined when no
 *                     filter is active to count company-wide.
 *   isFiltered      — whether a campaign filter is active. Distinguishes "no
 *                     filter → count everything" from "filter matched zero
 *                     campaigns → count nothing", which look identical from an
 *                     empty `scopeProjects` array alone.
 */
const ProjectKpis = ({ totalProjects = 0, scopeProjects = null, isFiltered = false }) => {
  // A filter matching zero campaigns must yield 0 leads, not all of them — so
  // an impossible condition is used rather than falling through to no scope.
  const NO_MATCH = [{ type: "equals", attribute: "id", value: "__no_projects__" }];

  const scope = React.useMemo(() => {
    if (!isFiltered) return []; // no filter → company-wide, as before
    const built = projectsLeadScope(scopeProjects || []);
    return built || NO_MATCH;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltered, scopeProjects]);

  // Serialised scope goes in every query key so the counts refetch when the
  // filter changes. The old keys were static, so they never refetched at all.
  const scopeKey = JSON.stringify(scope);

  const [today, unassigned, totalLeads] = useQueries({
    queries: [
      {
        queryKey: ["proj-kpi-leads-today", scopeKey],
        queryFn: () =>
          fetchLeadsCount([...scope, { type: "today", attribute: "createdAt" }]),
        staleTime: 1000 * 60 * 5,
        placeholderData: (prev) => prev,
      },
      {
        queryKey: ["proj-kpi-unassigned", scopeKey],
        queryFn: () =>
          fetchLeadsCount([
            ...scope,
            { type: "isNull", attribute: "assignedUserId" },
          ]),
        staleTime: 1000 * 60 * 5,
        placeholderData: (prev) => prev,
      },
      {
        queryKey: ["proj-kpi-total-leads", scopeKey],
        queryFn: () => fetchLeadsCount(scope),
        staleTime: 1000 * 60 * 5,
        placeholderData: (prev) => prev,
      },
    ],
  });

  const cards = [
    { label: "Projects", value: totalProjects, icon: "Layers", rail: "bg-[#6E1420]" },
    { label: "Leads Today", value: today.data ?? "—", icon: "UserPlus", rail: "bg-amber-500" },
    {
      label: "Unassigned",
      value: unassigned.data ?? "—",
      icon: "AlertCircle",
      rail: "bg-red-500",
      sub: "Needs distribution",
    },
    { label: "Total Leads", value: totalLeads.data ?? "—", icon: "Users", rail: "bg-teal-600" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <span className={`absolute bottom-0 left-0 top-0 w-1 ${c.rail}`} />
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon name={c.icon} size={15} className="text-[#8A1B29]" />
            {c.label}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {c.value}
          </div>
          {c.sub && (
            <div className="mt-1 text-xs font-medium text-red-600">{c.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProjectKpis;
