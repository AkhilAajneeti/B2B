import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchSiteVisits,
  fetchSiteVisitById,
} from "services/sitevisite.service";

// Paged, filtered list of site-visit leads. Mirrors useNewLeads but with its
// own ["site-visits", ...] cache namespace so it never collides with the main
// leads list. The service scopes every request to the site-visit statuses.
export const useSiteVisits = ({ limit, page, filters }) =>
  useQuery({
    queryKey: ["site-visits", limit, page, filters],
    queryFn: () => fetchSiteVisits({ limit, page, filters }),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

// Single site-visit lead by id, for the drawer. `enabled` lets the caller hold
// the fetch until the drawer is actually opened with a valid id.
export const useSiteVisit = (id, enabled = true) =>
  useQuery({
    queryKey: ["site-visit", id],
    queryFn: () => fetchSiteVisitById(id),
    enabled: enabled && !!id,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
