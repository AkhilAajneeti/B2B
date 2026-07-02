// Site Visits are not a separate backend entity — they are Leads whose
// `status` is one of the site-visit stages. This service is a thin domain
// wrapper over leads.service that bakes that scoping in one place, so the
// Site Visits page never has to know it's really querying Leads.
import {
  fetchLeadsById,
  createLead,
  updateLead,
  deleteLead,
  bulkDeleteleads,
} from "./leads.service";

const LEAD_URL = "https://gateway.aajneetiadvertising.com/Lead";

// The lead statuses that define a "site visit". Kept here so the filter,
// the hook, and any default-on-create all reference the same source of truth.
export const SITE_VISIT_STATUSES = ["Site Visit Scheduled", "Site Visit Done"];

// Status applied to a lead created from the Site Visits page when the form
// doesn't specify one — so a new record actually shows up in this view.
export const DEFAULT_SITE_VISIT_STATUS = "Site Visit Scheduled";

// Fields the Site Visits UI needs. Selected explicitly (matches the working
// backend request) so the list endpoint actually returns the visit date and
// the project/rep details we render.
const SELECT_FIELDS = [
  "name",
  "cProject",
  "cProjectName",
  "cProjectType",
  "phoneNumber",
  "cWhatsapp",
  "status",
  "cSiteVisitAt",
  "cNextContactAt",
  "createdAt",
  "assignedUserId",
  "assignedUserName",
].join(",");

// Fetch site-visit leads (status IN the site-visit statuses). `maxSize` stays
// within EspoCRM's list limit — over-limit requests (e.g. 500) can return an
// empty list, which is why the page previously showed no data.
export const fetchSiteVisits = async ({ limit = 200, page = 1 } = {}) => {
  const token = localStorage.getItem("auth_token");
  const offset = (page - 1) * limit;

  const params = new URLSearchParams();
  params.append("maxSize", String(limit));
  params.append("offset", String(offset));
  params.append("orderBy", "createdAt");
  params.append("order", "desc");
  params.append("whereGroup[0][type]", "in");
  params.append("whereGroup[0][attribute]", "status");
  SITE_VISIT_STATUSES.forEach((s) =>
    params.append("whereGroup[0][value][]", s),
  );
  params.append("attributeSelect", SELECT_FIELDS);

  const res = await fetch(`${LEAD_URL}?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", token },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch site visits");
  }

  return res.json();
};

export const fetchSiteVisitById = (id) => fetchLeadsById(id);

export const createSiteVisit = (payload = {}) =>
  createLead({ status: DEFAULT_SITE_VISIT_STATUS, ...payload });

export const updateSiteVisit = (id, payload) => updateLead(id, payload);

export const deleteSiteVisit = (id) => deleteLead(id);

export const bulkDeleteSiteVisits = (ids = []) => bulkDeleteleads(ids);
