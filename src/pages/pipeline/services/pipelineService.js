/**
 * Pipeline data-access layer.
 *
 * Responsibilities (kept out of components, per module rules):
 *  - grouped pipeline fetch (raw leads -> enriched -> grouped)
 *  - service-level TTL caching
 *  - in-flight request deduplication
 *  - pagination
 *  - persisting reschedule / delete actions for optimistic updates
 *
 * It only *consumes* the shared leads.service - it never modifies it - so the
 * pipeline module stays independent from the rest of the CRM.
 */
import { fetchNewLeads, updateLead, deleteLead } from "services/leads.service";
import {
  buildPipelineDeals,
  groupDealsByCategory,
} from "../utils/pipelineHelpers";
import {
  PIPELINE_CACHE_TTL,
  PIPELINE_PAGE_SIZE,
} from "../utils/pipelineConstants";

// ---------------------------------------------------------------------------
// Caching + request deduplication
// ---------------------------------------------------------------------------

const responseCache = new Map(); // key -> { data, timestamp }
const inFlightRequests = new Map(); // key -> Promise

const makeKey = ({ page, limit, dateFilter = {} }) =>
  // Cache key includes the date filter so currentMonth / lastMonth / etc.
  // each get their own cache slot instead of clobbering each other.
  `pipeline:p${page}:l${limit}:dt${dateFilter.dateType || "currentMonth"}:f${
    dateFilter.closeDateFrom || ""
  }:t${dateFilter.closeDateTo || ""}`;

/** Drop every cached pipeline page (call after a mutation succeeds). */
export const invalidatePipelineCache = () => {
  responseCache.clear();
  inFlightRequests.clear();
};

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch one page of pipeline leads.
 *
 * - returns the cached page when it is still fresh (unless `force`)
 * - dedupes concurrent identical requests via the in-flight map
 */
export const fetchPipelineLeads = async ({
  page = 1,
  limit = PIPELINE_PAGE_SIZE,
  dateFilter = { dateType: "currentMonth" },
  force = false,
} = {}) => {
  const key = makeKey({ page, limit, dateFilter });

  const cached = responseCache.get(key);
  if (!force && cached && Date.now() - cached.timestamp < PIPELINE_CACHE_TTL) {
    return cached.data;
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const request = (async () => {
    // Date scope flows from the pipeline store / filter bar — defaults to
    // current month so a fresh visit shows this month's leads. fetchNewLeads
    // recognises dateType + closeDateFrom + closeDateTo and translates them
    // into the right EspoCRM `where[…]` clause.
    const response = await fetchNewLeads({
      limit,
      page,
      filters: {
        dateType: dateFilter.dateType || "currentMonth",
        closeDateFrom: dateFilter.closeDateFrom || "",
        closeDateTo: dateFilter.closeDateTo || "",
      },
    });
    const list = response?.list || [];
    const data = {
      list,
      total: response?.total ?? list.length,
      page,
      limit,
      hasMore: page * limit < (response?.total ?? list.length),
    };
    responseCache.set(key, { data, timestamp: Date.now() });
    return data;
  })().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, request);
  return request;
};

/**
 * Grouped pipeline fetch: raw leads -> normalized + classified deals,
 * already bucketed into the kanban columns.
 */
export const getGroupedPipeline = async (params) => {
  const { list, total, hasMore } = await fetchPipelineLeads(params);
  const deals = buildPipelineDeals(list);
  return {
    deals,
    grouped: groupDealsByCategory(deals),
    total,
    hasMore,
  };
};

// ---------------------------------------------------------------------------
// Mutations (persist the optimistic UI changes to EspoCRM)
// ---------------------------------------------------------------------------

/**
 * Persist a follow-up reschedule. `nextContactDate` is an EspoCRM date-time
 * string. The cache is invalidated so the next read reflects the change.
 */
export const persistDealReschedule = async (id, nextContactDate) => {
  const result = await updateLead(id, {
    cNextContactAt: nextContactDate,
    cNextContact: nextContactDate,
  });
  invalidatePipelineCache();
  return result;
};

/** Persist a delete and invalidate the pipeline cache. */
export const deletePipelineDeal = async (id) => {
  const result = await deleteLead(id);
  invalidatePipelineCache();
  return result;
};
