import React from "react";
import { useQueries } from "@tanstack/react-query";
import Icon from "../../../components/AppIcon";
import { fetchLeadsCount } from "services/leads.service";

/**
 * ProjectKpis — the top KPI row. `totalProjects` comes from the project list;
 * the lead-based numbers are counted live. "Avg response" from the mockup needs
 * response-time tracking the backend doesn't have yet, so it's replaced by a
 * real "Total leads" metric for now.
 */
const ProjectKpis = ({ totalProjects = 0 }) => {
  const [today, unassigned, totalLeads] = useQueries({
    queries: [
      {
        queryKey: ["proj-kpi-leads-today"],
        queryFn: () => fetchLeadsCount([{ type: "today", attribute: "createdAt" }]),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ["proj-kpi-unassigned"],
        queryFn: () =>
          fetchLeadsCount([{ type: "isNull", attribute: "assignedUserId" }]),
        staleTime: 1000 * 60 * 5,
      },
      {
        queryKey: ["proj-kpi-total-leads"],
        queryFn: () => fetchLeadsCount([]),
        staleTime: 1000 * 60 * 5,
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
