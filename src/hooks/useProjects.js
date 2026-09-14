// hooks/useProjects.js
import { useMemo } from "react";
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

// ---------------------------------------------------------------------------
// Project options — the canonical project list, shaped for a <Select>.
// ---------------------------------------------------------------------------
//
// Why a dedicated hook instead of deriving the list from the leads on screen:
// the Leads table is server-paginated (20 rows/page), so the browser only ever
// holds one page of leads. Distinct `cProject` values harvested from those rows
// would change on every page flip and would never contain the project the rep
// is actually looking for. CProjects is the canonical list, and one request
// covers all of it.
//
// Cheap by design:
//   - localStorage seed (`initialData`) so a reload paints the dropdown with
//     zero network wait;
//   - `initialDataUpdatedAt: 0` marks that seed stale so React Query refreshes
//     it in the background — the rep never sees a stale project list;
//   - 30-min `staleTime`, so navigating around the app doesn't refetch.

const PROJECT_OPTIONS_CACHE_KEY = "project_options_v1";
const PROJECT_OPTIONS_TTL = 1000 * 60 * 60 * 24; // 1 day

// Espo caps `maxSize` per request, so page through rather than asking for
// everything at once. In practice this is a single round trip.
const PROJECT_PAGE_SIZE = 200;
const PROJECT_MAX = 2000;

const readCachedProjectOptions = () => {
  try {
    const raw = localStorage.getItem(PROJECT_OPTIONS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || !Array.isArray(parsed.list)) return null;
    if (Date.now() - parsed.timestamp > PROJECT_OPTIONS_TTL) {
      localStorage.removeItem(PROJECT_OPTIONS_CACHE_KEY);
      return null;
    }
    return parsed.list;
  } catch {
    return null;
  }
};

const writeCachedProjectOptions = (list) => {
  try {
    localStorage.setItem(
      PROJECT_OPTIONS_CACHE_KEY,
      JSON.stringify({ list, timestamp: Date.now() }),
    );
  } catch {
    // quota / disabled — the hook still works, it just refetches each session.
  }
};

export const useProjectOptions = ({ enabled = true } = {}) => {
  const query = useQuery({
    queryKey: ["project-options"],
    queryFn: async () => {
      const all = [];
      for (let page = 1; all.length < PROJECT_MAX; page += 1) {
        const res = await fetchProjects({
          page,
          limit: PROJECT_PAGE_SIZE,
          orderBy: "name",
          order: "asc",
        });
        const list = res?.list || [];
        // Keep only the fields the filter needs — the cached blob stays small
        // and doesn't go stale against unrelated project edits.
        all.push(
          ...list.map((p) => ({
            id: p?.id,
            name: p?.name,
            projectNomen: p?.projectNomen,
            clientNomen: p?.clientNomen,
          })),
        );
        if (list.length < PROJECT_PAGE_SIZE) break;
      }
      writeCachedProjectOptions(all);
      return all;
    },
    enabled,
    initialData: () => readCachedProjectOptions() ?? undefined,
    // 0 = treat the localStorage seed as immediately stale so React Query
    // fires a background refresh behind the instantly-painted list.
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // `value` is the project NAME, not its id, so the filter value stays a plain
  // string end to end: the existing pill, the sessionStorage persistence and
  // the free-text fallback in the service all keep working untouched. The full
  // record rides along in `project` for the caller to stash as `cProjectRef`.
  const options = useMemo(() => {
    const seen = new Set();
    return (query.data || [])
      .map((p) => ({ ...p, name: (p?.name || "").trim() }))
      .filter((p) => {
        if (!p.name) return false;
        const key = p.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({ value: p.name, label: p.name, project: p }));
  }, [query.data]);

  return { options, isLoading: query.isLoading && !query.data };
};
