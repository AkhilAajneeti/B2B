import { useQuery } from "@tanstack/react-query";
import { fetchTasks } from "services/tasks.service";

export const useTasks = () => {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 1000 * 60 * 5,
  });
};
