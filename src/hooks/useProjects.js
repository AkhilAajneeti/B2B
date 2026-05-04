// hooks/useProjects.js
import { useQuery } from "@tanstack/react-query";
import { fetchProjects, fetchProjectsById } from "services/projects.service";

export const useProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
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