// hooks/useTeams.js
import { useQuery } from "@tanstack/react-query";
import { fetchTeam } from "services/team.service";

export const useTeams = () => {
  return useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeam,
    staleTime: 1000 * 60 * 5,
  });
};