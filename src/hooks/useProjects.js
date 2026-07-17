// hooks/useProjects.js
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, fetchProjectsById } from "services/projects.service";

export const useProjects = ({
  limit = 10,
  page = 1,
  filters = {},
  orderBy = "createdAt",
  order = "desc",
  // Opt-out switch for callers that only need this list conditionally (the
  // campaigns KPI row fetches the full filtered set for scoping, but only when
  // a filter is actually active). Defaults true so existing callers are
  // unaffected.
  enabled = true,
}) => {
  return useQuery({
    queryKey: ["projects", limit, page, filters, orderBy, order],
    queryFn: () => fetchProjects({ limit, page, filters, orderBy, order }),
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProject = (id, enabled) => {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProjectsById(id),
    enabled,
  });
};