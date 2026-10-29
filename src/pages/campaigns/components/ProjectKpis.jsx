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
// One accent hex drives the icon tile, the card's wash, the corner glow and
// the hover halo — the same derivation as the dashboard's KPICard and the Team
// Performance tiles, so all three rows read as one system.
const hexToRgba = (hex = "#3B82F6", a = 1) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

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
    { label: "Projects", value: totalProjects, icon: "Layers", accent: "#8A1B29" },
    { label: "Leads Today", value: today.data ?? "—", icon: "UserPlus", accent: "#F59E0B" },
    {
      label: "Unassigned",
      value: unassigned.data ?? "—",
      icon: "AlertCircle",
      accent: "#EF4444",
      sub: "Needs distribution",
    },
    { label: "Total Leads", value: totalLeads.data ?? "—", icon: "Users", accent: "#0D9488" },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const tint = hexToRgba(c.accent, 0.12); // icon tile
        const wash = hexToRgba(c.accent, 0.06); // the card's own gradient
        const blob = hexToRgba(c.accent, 0.22); // corner glow
        const glow = hexToRgba(c.accent, 0.35); // hover halo

        return (
          <div
            key={c.label}
            style={{
              "--kpi-glow": glow,
              backgroundImage: `linear-gradient(135deg, ${wash} 0%, transparent 60%)`,
            }}
            className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04),0_2px_8px_rgba(16,24,40,.05)] transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_44px_-16px_var(--kpi-glow)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-5"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
              style={{ background: `radial-gradient(circle, ${blob}, transparent 70%)` }}
            />

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 ease-premium group-hover:scale-105 motion-reduce:transition-none sm:h-12 sm:w-12"
                style={{ backgroundColor: tint }}
              >
                <Icon name={c.icon} size={20} color={c.accent} />
              </span>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {c.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold leading-none tabular-nums tracking-tight text-foreground sm:text-3xl">
                  {c.value}
                </p>
                {c.sub && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {c.sub}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectKpis;
