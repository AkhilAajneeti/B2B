import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { fetchLeads, fetchLeadsCount, fetchNewLeads } from "services/leads.service"

export const useLeads = ({ limit, page }) => {
    return useQuery({
        queryKey: ["leads", limit, page],
        queryFn: () => fetchLeads({ limit, page }),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,

        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })
}

export const useLeadsCount = (filters) => {
    // Include the current user id in the queryKey so React Query treats
    // different users' counts as different cache entries. The previous
    // key `["leads-count", filters]` was filter-only: after logout +
    // login as a different user (same tab, no full reload), the new
    // user saw the previous user's cached number until the React
    // Query cache aged out — that's the "dashboard shows wrong count
    // after switching users" bug.
    let userId = "guest";
    try {
        userId = JSON.parse(localStorage.getItem("login_object"))?.id || "guest";
    } catch {
        userId = "guest";
    }
    return useQuery({
        queryKey: ["leads-count", userId, filters], // 🔥 user-scoped
        queryFn: () => fetchLeadsCount(filters),
        keepPreviousData: true,
        staleTime: 1000 * 60 * 5, // cache 5 min
        cacheTime: 1000 * 60 * 30, // keep in memory 30 min
    });
};
export const useNewLeads = ({ limit, page, filters }) => {
    return useQuery({
        queryKey: ["leads", limit, page, filters],
        queryFn: () => fetchNewLeads({ limit, page, filters }),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    })
}
