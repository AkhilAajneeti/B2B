// Site Visits are not a separate backend entity — they are Leads whose
// `status` is one of the site-visit stages. This service is a thin domain
// wrapper over leads.service that bakes that scoping in one place, so the
// Site Visits page never has to know it's really querying Leads.
import {
  fetchNewLeads,
  fetchLeadsById,
  createLead,
  updateLead,
  deleteLead,
  bulkDeleteleads,
} from "./leads.service";

// The lead statuses that define a "site visit". Kept here so the filter,
// the hook, and any default-on-create all reference the same source of truth.
export const SITE_VISIT_STATUSES = ["Site Visit Scheduled", "Site Visit Done"];

// Status applied to a lead created from the Site Visits page when the form
// doesn't specify one — so a new record actually shows up in this view.
export const DEFAULT_SITE_VISIT_STATUS = "Site Visit Scheduled";

// Merge the caller's filters with the locked site-visit status scope.
// If the user narrows the status filter, we intersect it with the site-visit
// set so the view can never leak non-site-visit leads; if they clear it, we
// fall back to the full site-visit set.
const withSiteVisitScope = (filters = {}) => {
  const requested = Array.isArray(filters.status) ? filters.status : [];
  const scoped = requested.filter((s) => SITE_VISIT_STATUSES.includes(s));
  return {
    ...filters,
    status: scoped.length ? scoped : SITE_VISIT_STATUSES,
  };
};

export const fetchSiteVisits = ({ limit, page, filters }) =>
  fetchNewLeads({ limit, page, filters: withSiteVisitScope(filters) });

export const fetchSiteVisitById = (id) => fetchLeadsById(id);

export const createSiteVisit = (payload = {}) =>
  createLead({ status: DEFAULT_SITE_VISIT_STATUS, ...payload });

export const updateSiteVisit = (id, payload) => updateLead(id, payload);

export const deleteSiteVisit = (id) => deleteLead(id);

export const bulkDeleteSiteVisits = (ids = []) => bulkDeleteleads(ids);
