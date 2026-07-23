/**
 * Import module — shared constants.
 *
 * One place for every option list, enum map, and the drawer's initial-state
 * object. Components import from here so adding a new entity / status / lead
 * field only needs one file edit instead of grepping the page.
 */

export const API_BASE = "https://gateway.aajneetiadvertising.com";

// ---------------------------------------------------------------------------
// Filter options (used by ImportFilters)
// ---------------------------------------------------------------------------

export const STATUS_OPTIONS = [
  { value: "Complete", label: "Complete" },
  { value: "In Progress", label: "In Progress" },
  { value: "Failed", label: "Failed" },
  { value: "Standby", label: "Standby" },
];

export const ENTITY_TYPE_OPTIONS = [
  { value: "Lead", label: "Lead" },
  { value: "Account", label: "Account" },
  { value: "Contact", label: "Contact" },
  { value: "Opportunity", label: "Opportunity" },
];

export const DATE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "lastSevenDays", label: "Last 7 Days" },
  { value: "currentMonth", label: "Current Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "currentQuarter", label: "Current Quarter" },
  { value: "lastQuarter", label: "Last Quarter" },
  { value: "on", label: "Specific Day" },
  { value: "before", label: "Before a Date" },
  { value: "after", label: "After a Date" },
  { value: "between", label: "Date Range" },
];

export const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 per page" },
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

// ---------------------------------------------------------------------------
// New-Import drawer options
// ---------------------------------------------------------------------------

// EspoCRM's standard "what to do with each row" import modes. Values use the
// same enum strings EspoCRM expects when we POST the import job.
export const WHAT_TO_DO_OPTIONS = [
  { value: "createOnly", label: "Create Only" },
  { value: "createAndUpdate", label: "Create and Update" },
  { value: "updateOnly", label: "Update Only" },
];

// "What to do?" mode → EspoCRM `action` enum on the import POST. Internal
// values stay descriptive (createOnly / …); this map translates at submit
// time so the API payload uses EspoCRM's expected strings.
export const ACTION_MAP = {
  createOnly: "create",
  createAndUpdate: "createAndUpdate",
  updateOnly: "update",
};

export const FIELD_OPTIONS = [
  { value: "", label: "-Skip-" },
  { value: "accountName", label: "Account Name" },
  { value: "assignedUserName", label: "Assigned User Name" },
  { value: "assignedUserId", label: "Assigned User (ID)" },
  { value: "campaignId", label: "Campaign (ID)" },
  { value: "campaignName", label: "Campaign (Name)" },
  { value: "cCampaignName", label: "CampaignName" },
  { value: "addressCity", label: "City" },
  { value: "cClientNomen", label: "ClientNomen" },
  { value: "convertedAt", label: "Converted At" },
  { value: "addressCountry", label: "Country" },
  { value: "createdAt", label: "Created At" },
  { value: "createdAccountId", label: "Account (ID)" },
  { value: "createdAccountName", label: "Account (Name)" },
  { value: "createdById", label: "Created By (ID)" },
  { value: "createdByName", label: "Created By (Name)" },
  { value: "createdContactId", label: "Contact (ID)" },
  { value: "createdContactName", label: "Contact (Name)" },
  { value: "createdOpportunityId", label: "Opportunity (ID)" },
  { value: "createdOpportunityName", label: "Opportunity (Name)" },
  { value: "description", label: "Description" },
  // `title` shows in the EspoCRM admin dropdown as "Designation" — keep
  // the label in sync so the error-modal field-label lookup matches.
  { value: "title", label: "Designation" },
  { value: "doNotCall", label: "Do Not Call" },
  { value: "emailAddress", label: "Email" },
  { value: "emailAddressData", label: "Email Address Data" },
  { value: "emailAddressIsInvalid", label: "Email Address is Invalid" },
  { value: "emailAddressIsOptedOut", label: "Email Address is Opted-Out" },
  { value: "emailAddress2", label: "Email 2" },
  { value: "emailAddress3", label: "Email 3" },
  { value: "emailAddress4", label: "Email 4" },
  { value: "firstName", label: "First Name" },
  { value: "id", label: "ID" },
  { value: "industry", label: "Industry" },
  { value: "lastName", label: "Last Name" },
  { value: "cLeadId", label: "Lead Id" },
  { value: "cLeatReceivedAt", label: "Lead Received At" },
  { value: "cLeadSource", label: "Lead Source" },
  { value: "middleName", label: "Middle Name" },
  { value: "modifiedAt", label: "Modified At" },
  { value: "modifiedById", label: "Modified By (ID)" },
  { value: "modifiedByName", label: "Modified By (Name)" },
  { value: "name", label: "Name" },
  { value: "cNextContactAt", label: "Next Contact At" },
  { value: "opportunityAmount", label: "Opportunity Amount" },
  { value: "opportunityAmountCurrency", label: "Opportunity Amount Currency" },
  { value: "phoneNumber", label: "Phone" },
  { value: "phoneNumberFax", label: "Phone (Fax)" },
  { value: "phoneNumberHome", label: "Phone (Home)" },
  { value: "phoneNumberMobile", label: "Phone (Mobile)" },
  { value: "phoneNumberOffice", label: "Phone (Office)" },
  { value: "phoneNumberOther", label: "Phone (Other)" },
  { value: "phoneNumberIsInvalid", label: "Phone Number is Invalid" },
  { value: "phoneNumberIsOptedOut", label: "Phone Number is Opted-Out" },
  { value: "cPlatform", label: "Platform" },
  { value: "addressPostalCode", label: "Postal Code" },
  { value: "cPreference", label: "Preference" },
  { value: "cProject", label: "Project" },
  { value: "cProjectBudget", label: "Project Budget" },
  { value: "cProjectLocation", label: "Project Location" },
  { value: "cProjectName", label: "Project Name" },
  { value: "cProjectType", label: "Project Type" },
  { value: "cProjectNomen", label: "ProjectNomen" },
  { value: "salutationName", label: "Salutation" },
  { value: "cSiteVisitAt", label: "Site Visit At" },
  { value: "source", label: "Source" },
  { value: "addressState", label: "State" },
  { value: "status", label: "Status" },
  { value: "streamUpdatedAt", label: "Stream Updated At" },
  { value: "addressStreet", label: "Street" },
  { value: "cSubSource", label: "Sub Source" },
  { value: "targetListId", label: "Target List (ID)" },
  { value: "targetListName", label: "Target List (Name)" },
  { value: "teamsIds", label: "Teams (IDs)" },
  { value: "website", label: "Website" },
  { value: "cWhatsapp", label: "Whatsapp" },
  { value: "cWhatsappTemplate", label: "Whatsapp Template" },
  { value: "cWhatsapp1", label: "Whatsapp1" },
];

// Per-lead status pill palette for the overview tables. Matches the deals
// page palette so a "Site Visit Scheduled" pill looks identical across
// modules.
export const LEAD_STATUS_PILL = {
  New: "bg-gray-100 text-gray-700",
  Interested: "bg-emerald-50 text-emerald-700",
  "Follow up": "bg-indigo-50 text-indigo-700",
  "Call Later": "bg-amber-50 text-amber-700",
  "Call Not Connecting": "bg-rose-50 text-rose-700",
  "Call Not Picked": "bg-amber-50 text-amber-700",
  Dead: "bg-slate-200 text-slate-800",
  "Site Visit Scheduled": "bg-sky-50 text-sky-700",
  "Site Visit Done": "bg-teal-50 text-teal-700",
  Purchased: "bg-green-50 text-green-700",
  QDTD: "bg-fuchsia-50 text-fuchsia-700",
};

// Drawer initial state. Used by ImportDrawer on mount and to reset state on
// close — keeping it here so any new field added to the drawer flow only
// touches this object once.
export const DRAWER_INITIAL = {
  open: false,
  step: 1,
  entityType: "",
  whatToDo: "createOnly",
  fileName: "",
  headers: [],
  rows: [],
  // Header -> EspoCRM attribute key (or "" for skip). Auto-populated when
  // moving Step 1 → Step 2; rep can override per row.
  mapping: {},
  // Raw `File` reference kept so we can re-read its text on submit without
  // re-prompting the rep.
  file: null,
  // Set true while POST /Import/file + POST /Import are in flight.
  submitting: false,
  // Step 3 (overview) state — populated after a successful import.
  importResult: null,
  imported: [],
  duplicates: [],
  // Per-row import errors (validation failures, save errors, etc.).
  errors: [],
  // The error currently being inspected in the detail modal. `null` =
  // modal closed; otherwise we render an overlay with this error's row +
  // validation failures.
  selectedError: null,
  // Tracks which error row's dropdown menu (View / Remove) is open. Empty
  // string = no menu open. Single-string state instead of per-row flags
  // so we never get two menus open simultaneously.
  openErrorRowId: "",
  // Name of an in-flight action button (e.g. "Revert Import") so we can
  // spin only that button instead of all three.
  pendingAction: "",
};
