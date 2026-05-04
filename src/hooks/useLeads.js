import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchLeads, fetchLeadsCount, fetchNewLeads } from "services/leads.service"

export const useLeads = ({ limit, page }) => {
    return useQuery({
        queryKey: ["leads", limit, page],
        queryFn: () => fetchLeads({ limit: 1000, page: 0 }),
        placeholderData: keepPreviousData,
    })
}

export const useLeadsCount = (filters) => {
    return useQuery({
        queryKey: ["leads-count", filters], // 🔥 important for caching
        queryFn: () => fetchLeadsCount(filters),
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5, // cache 5 min
        cacheTime: 1000 * 60 * 30, // keep in memory 30 min
    });
};
export const useNewLeads = ({ limit, page, filters }) => {
    return useQuery({
        queryKey: ["leads", limit, page, JSON.stringify(filters)],
        queryFn: () => fetchNewLeads({ limit, page, filters }),
        placeholderData: keepPreviousData,
    })
}
