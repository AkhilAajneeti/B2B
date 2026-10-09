import React, { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import TricolorBurst from "../../components/TricolorBurst";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import DealsTable from "./components/DealsTable";
import DealsFilters from "./components/DealsFilters";
import DealDrawer from "./components/DealDrawer";
import Papa from "papaparse";
import TablePagination from "./components/TablePagination";
import ExportDialog from "./components/ExportDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLead,
  createLeadActivity,
  deleteActivity,
  deleteLead,
  updateLead,
  fetchLeadsByIds,
  fetchLeadsForExport,
  EXPORT_SELECTION_LIMIT,
  EXPORT_RANGE_OPTIONS,
} from "services/leads.service";
import ConfirmDeleteModal from "./components/ConfirmDeleteModal";
import StatusChart from "./components/charts/StatusChart";
import IndustryChart from "./components/charts/IndustryChart";
import AssignedUserChart from "./components/charts/AssignedUserChart";
import ProjectChart from "./components/charts/ProjectChart";
import MultiLineChart from "pages/dashboard/components/MultiLineChart";
import { useLeads, useNewLeads } from "hooks/useLeads";
import { useMetaData } from "hooks/useMetaData";
import { useLeadDetails } from "hooks/useLeadDetails";
import { useUsers } from "hooks/useUsers";
import { fetchTeamUser } from "services/team.service";
import { useTeamUsers } from "hooks/useTeams";
// import { canCreate, canDelete, canEdit } from "utils/permission";
import {
  canCreate,
  canEditRecord,
  canDeleteRecord,
  getStoredUser,
  isMaskedUser,
  isSupAdmin,
} from "utils/permission";
import { useLocation } from "react-router-dom";

// Inactive / junk statuses hidden from the Leads table by default — these leads
// live in the Inactive Leads section instead, so the Leads table shows only
// active leads. Picking one of these explicitly in the status filter still
// shows it (see filtersForBackend below).
const LEADS_HIDDEN_STATUSES = [
  "Broker",
  "Dead",
  "Low Budget",
  "Duplicate",
  "Invalid Number",
  "Irrelevant Lead",
  "Fake Lead"
];

const DealsPage = () => {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Deliberately NOT persisted, unlike the filters/sort/page beside it. A
  // refresh is the natural "start over" gesture, and coming back to a page
  // that silently still has 400 leads ticked — then hitting a bulk action on
  // them — is a worse failure than having to re-select. The Clear selection
  // button in the toolbar covers doing it on purpose.
  const [selectedDeals, setSelectedDeals] = useState([]);

  // const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage, setItemsPerPage] = useState(25);
  const [limit, setLimit] = useState(20);
  // Use a lazy initializer for `page` so the persisted value (set below in
  // the filters section) is honoured on remount.
  const [page, setPage] = useState(() => {
    try {
      const raw = sessionStorage.getItem("deals.tableState");
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.page || 1;
    } catch {
      return 1;
    }
  });
  const [mode, setMode] = useState("view");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // The single lead awaiting delete confirmation. Holds the whole record so
  // the dialog can name it; null when the dialog is closed.
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPhase, setExportPhase] = useState("idle");
  const [exportProgress, setExportProgress] = useState({
    fetched: 0,
    target: 0,
  });
  const [exportResultCount, setExportResultCount] = useState(0);
  const location = useLocation();
  const canCreateLead = canCreate("Lead");

  const { data: metaData } = useMetaData();
  const { data: leadsDetails } = useLeadDetails(selectedDeal?.id, mode);
  const { data: usersData } = useUsers();
  const currentUser = getStoredUser();
  const currentTeamIds = useMemo(
    () => [...new Set([
      ...(currentUser?.teamsIds || []),
      ...(currentUser?.teamIds || []),
      currentUser?.teamId,
      currentUser?.defaultTeamId,
    ].filter(Boolean))],
    [currentUser?.defaultTeamId, currentUser?.teamId, currentUser?.teamIds, currentUser?.teamsIds],
  );
  const { data: teamUsersData } = useQuery({
    queryKey: ["team-users", currentTeamIds],
    queryFn: async () => {
      const responses = await Promise.all(currentTeamIds.map((id) => fetchTeamUser(id)));
      return {
        list: responses.flatMap((response) => response?.list || []),
      };
    },
    enabled: currentTeamIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  // Persist filters / page / sort across navigation. The user expects them to
  // survive jumping into a lead's drawer (which can navigate to /tasks etc.)
  // and coming back. Cleared only via the Clear-Filters button or tab close.
  const DEALS_STATE_KEY = "deals.tableState";
  const DEFAULT_FILTERS = {
    search: "",
    // Multi-select — rep can pick e.g. ["Interested", "Follow up"].
    // Empty array = no status filter applied.
    status: [],
    sector: "",
    cProject: "",
    // The CProjects record behind `cProject` when it was picked from the
    // dropdown (null for a free-typed search). Drives the precise match.
    cProjectRef: null,
    source: "",
    assignUser: "",
    team: "",
    dateType: "",
    closeDateFrom: "",
    closeDateTo: "",
    xDays: "",
  };
  const DEFAULT_SORT = { key: "createdAt", direction: "desc" };
  const loadPersistedState = () => {
    try {
      const raw = sessionStorage.getItem(DEALS_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const persisted = loadPersistedState();

  const [sortConfig, setSortConfig] = useState(persisted?.sortConfig || DEFAULT_SORT);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...(persisted?.filters || {}) });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        DEALS_STATE_KEY,
        JSON.stringify({ filters, sortConfig, page }),
      );
    } catch {
      /* sessionStorage full / disabled — persistence degrades silently */
    }
  }, [filters, sortConfig, page]);

  // Team filter → fetch users in the selected team and expose their ids as an
  // internal `_teamUserIds` field on the filters object. Service translates it
  // into `assignedUserId IN [...]`. The team-users query is cached by React
  // Query (10-min staleTime), so flipping teams is instant after first use.
  const { data: filterTeamUsersData } = useTeamUsers(filters.team);
  const filterTeamUserIds = useMemo(
    () =>
      filters.team
        ? (filterTeamUsersData?.list || []).map((u) => u.id)
        : null,
    [filters.team, filterTeamUsersData],
  );
  const filtersForBackend = useMemo(() => {
    const base =
      filters.team && filterTeamUserIds !== null
        ? { ...filters, _teamUserIds: filterTeamUserIds }
        : { ...filters };
    const statusArr = filters.status || [];
    if (statusArr.includes("All")) {
      // "All Leads" selected → drop the status filter entirely and skip the
      // default exclusion, so every lead (junk statuses included) shows.
      base.status = [];
    } else if (statusArr.length === 0) {
      // Default view hides the inactive/junk statuses so only valid leads show.
      // An explicit status pick overrides this (choose "Broker" and it appears).
      base.excludeStatus = LEADS_HIDDEN_STATUSES;
    }
    return base;
  }, [filters, filterTeamUserIds]);

  // `orderBy`/`order` were missing here, so every request went out with the
  // hook's createdAt/desc default: the sort arrows flipped and `sortConfig`
  // persisted, but the list never actually re-ordered. Reports has always
  // passed them, which is why sorting worked there and not here.
  const { data: leadsData, isLoading } = useNewLeads({
    limit,
    page,
    filters: filtersForBackend,
    orderBy: sortConfig?.key,
    order: sortConfig?.direction,
  });
  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      toast.success("Lead created");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      // Pass the same id as the loading toast so this replaces it instead
      // of stacking on top — otherwise the spinner stays on screen forever.
      toast.success("Deleted", { id: "delete-lead" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err) => {
      console.error("Delete failed", err);
      toast.error("Failed to delete lead", { id: "delete-lead" });
    },
  });
  // fetch leads
  const allLeads = leadsData?.list || [];
  const leads = allLeads;
  const usersById = useMemo(() => {
    const combinedUsers = [
      ...(usersData?.list || []),
      ...(teamUsersData?.list || []),
    ];

    return combinedUsers.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [teamUsersData, usersData]);
  const teamUserIds = useMemo(
    () => new Set((teamUsersData?.list || []).map((user) => user.id)),
    [teamUsersData],
  );

  const getPermissionRecord = (lead) => {
    const assignedUser = usersById[lead?.assignedUserId];
    const isAssignedToCurrentTeam = teamUserIds.has(lead?.assignedUserId);

    if (!assignedUser) return lead;

    return {
      ...lead,
      teamsIds:
        lead?.teamsIds?.length
          ? lead.teamsIds
          : assignedUser.teamsIds?.length
            ? assignedUser.teamsIds
            : assignedUser.teamIds?.length
              ? assignedUser.teamIds
              : assignedUser.defaultTeamId
                ? [assignedUser.defaultTeamId]
                : isAssignedToCurrentTeam
                  ? currentTeamIds
                  : lead?.teamsIds,
      teamId: lead?.teamId || assignedUser.defaultTeamId || assignedUser.teamId || (isAssignedToCurrentTeam ? currentTeamIds[0] : null),
    };
  };

  const selectedLeadRecords = useMemo(
    () => leads.filter((lead) => selectedDeals.includes(lead.id)),
    [leads, selectedDeals],
  );
  const source = metaData?.sources || [];
  const status = metaData?.status || [];
  const industry = metaData?.industries || [];
  const total = leadsData?.total || 0;
  const exportLeadsToCSV = (rows, fileName = "leads_export") => {
    // Contact details are most of what this export is FOR, so a restricted
    // user doesn't get one at all — masking the table while letting them
    // download the raw numbers would defeat the whole thing. Guarded here
    // rather than only on the button, so the bulk "export selected" action
    // can't reach it either.
    if (isMaskedUser()) {
      toast.error("Export isn't available for your account");
      return;
    }

    if (!rows || rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = rows.map((lead) => ({
      Name: lead?.name || "",
      Email: lead?.emailAddress || "",
      Phone: `"${lead?.phoneNumber || ""}"`,
      Status: lead?.status || "",
      // Mirror the table: it shows cSubSource and falls back to source.
      Source: lead?.cSubSource || lead?.source || "",
      "Project Name": lead?.cProject || lead?.cProjectName || "",
      "Assigned User": lead?.assignedUserName || "",
      // Was reading `cNextContact`, which isn't a field — always blank.
      "Next Contact": lead?.cNextContactAt || "",
      "Created At": lead?.createdAt || "",
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}_${new Date().toISOString().split("T")[0]}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const totalPages = Math.ceil(total / limit);

  const handleMenuToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleAddLeads = () => {
    setSelectedDeal(null);
    setMode("add");
    setIsDrawerOpen(true);
  };

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setMode("view");
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedDeal(null);
  };
  const handleCreateLead = async (payload) => {
    try {
      createLeadMutation.mutate(payload);
    } catch (err) {
      console.error("Lead creationd failed", err);
    }
  };

  const handleUpdateLead = async (id, payload) => {
    const record = selectedDeal?.id === id
      ? selectedDeal
      : leads.find((lead) => lead.id === id);

    if (record && !canEditRecord("Lead", getPermissionRecord(record))) {
      toast.error("You do not have permission to edit this lead");
      return;
    }

    await updateLead(id, payload);
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  // Quick Edit (mobile bottom sheet) save. Does two things from one tap:
  //   1. Updates the changed lead fields (status / description / follow-up) —
  //      `fields.description` overwrites the lead's description, same field the
  //      drawer edits.
  //   2. Also logs the note to the activity STREAM (same Post the drawer
  //      creates), so call history accumulates instead of being lost to the
  //      description overwrite.
  // Throws on permission denial so the sheet stays open; the stream post is
  // best-effort (the note is already saved to description) so a stream failure
  // doesn't fail the whole save.
  const handleQuickUpdate = async (id, { fields = {}, note = "" } = {}) => {
    const record = leads.find((lead) => lead.id === id);
    if (record && !canEditRecord("Lead", getPermissionRecord(record))) {
      toast.error("You do not have permission to edit this lead");
      throw new Error("permission-denied");
    }

    if (Object.keys(fields).length) {
      await updateLead(id, fields);
    }

    if (note) {
      try {
        await createLeadActivity({
          post: note,
          parentId: id,
          parentType: "Lead",
          type: "Post",
          isInternal: false,
          attachmentsIds: [],
        });
      } catch (streamErr) {
        // Note is already saved to description above, so keep the save a
        // success — just surface that the stream log didn't post.
        console.error("Quick note stream post failed", streamErr);
        toast.error("Saved, but couldn't add the note to activity");
      }
    }

    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-stream", id] });
  };

  // Row trash icon → open the shared confirm dialog (same one bulk delete
  // uses). Permission is checked here so we never open a dialog the user
  // can't act on.
  const handleRequestDeleteLead = (deal) => {
    if (deal && !canDeleteRecord("Lead", getPermissionRecord(deal))) {
      toast.error("You do not have permission to delete this lead");
      return;
    }
    setLeadToDelete(deal);
  };

  const handleConfirmDeleteLead = () => {
    const id = leadToDelete?.id;
    if (!id) return;

    toast.loading("Deleting lead...", { id: "delete-lead" });
    deleteLeadMutation.mutate(id, {
      onSettled: () => setLeadToDelete(null),
    });
  };

  // Kept for the drawer, which deletes by id.
  const handleDeleteLead = async (id) => {
    const record = leads.find((lead) => lead.id === id);

    if (record && !canDeleteRecord("Lead", getPermissionRecord(record))) {
      toast.error("You do not have permission to delete this lead");
      return;
    }

    try {
      toast.loading("Deleting lead...", { id: "delete-lead" });
      deleteLeadMutation.mutate(id);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };
  const handleDeleteActivity = async (id) => {
    try {
      await deleteActivity(id); // API call
      toast.success("Activity deleted successfully");
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleSelectDeal = (dealId, isSelected) => {
    if (isSelected) {
      setSelectedDeals([...selectedDeals, dealId]);
    } else {
      setSelectedDeals(selectedDeals?.filter((id) => id !== dealId));
    }
  };

  const handleSelectAll = (isSelected) => {
    const currentPageDeals = leads.map((deal) => deal.id);

    if (isSelected) {
      setSelectedDeals([...new Set([...selectedDeals, ...currentPageDeals])]);
    } else {
      setSelectedDeals(
        selectedDeals.filter((id) => !currentPageDeals.includes(id))
      );
    }
  };

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig?.key === key && prevConfig?.direction === "asc"
          ? "desc"
          : "asc",
    }));
    // Back to page 1 — you sort to bring something to the top, and page 5 of a
    // freshly re-ordered list is a different set of rows entirely. Same reset
    // the filter changes already do.
    setPage(1);
  };

  // Changing the filter changes WHICH records match, so a carried-over
  // selection would hold ids that are no longer on screen — harmless for an
  // export, but Delete Selected would act on records the rep can't see.
  // Deliberately not done on sort: sorting reorders the same matching set, so
  // the selection stays both valid and visible.
  const clearSelectionForNewResultSet = () => {
    setSelectedDeals((prev) => {
      if (prev.length) toast("Selection cleared", { icon: "\u2139\ufe0f" });
      return [];
    });
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    clearSelectionForNewResultSet();
    setPage(1);
  };

  const handleClearFilters = () => {
    clearSelectionForNewResultSet();
    setFilters({
      search: "",
      status: [],
      sector: "",
      cProject: "",
      source: "",
      assignUser: "",
      team: "",
      dateType: "",
      closeDateFrom: "",
      closeDateTo: "",
      xDays: ""
    });
    setPage(1);
  };
  // Why a bulk action is being refused — distinguishing the two very
  // different causes that previously shared one message.
  //
  // Mass Update and Delete verify permissions per record, and the only records
  // this page holds are the current page (`selectedLeadRecords` filters
  // `leads`). A selection spanning pages therefore can't be fully verified, so
  // the action is refused. That part is deliberate: failing closed on a
  // destructive action is the right default. What was wrong is that it said
  // "you don't have permission", sending people to hunt through roles for a
  // problem that didn't exist.
  //
  // Export is unaffected — it sends ids to the CRM and never needs the records
  // locally, which is why it handles the full selection.
  const bulkBlockReason = (allowedIds, actionLabel, permissionVerb) => {
    const offPage = selectedDeals.length - selectedLeadRecords.length;
    if (offPage > 0) {
      return `${selectedDeals.length} leads selected across pages — ${actionLabel} works one page at a time (${selectedLeadRecords.length} on this page). Use Export Selected for the whole selection.`;
    }
    if (!allowedIds.length || allowedIds.length !== selectedDeals.length) {
      return `Select only leads you have permission to ${permissionVerb}`;
    }
    return null;
  };

  // Export the first N matching the current filter + sort. No selection
  // involved — this is the "I want the top 500 of what I'm looking at" case,
  // which ticking checkboxes across five pages served badly.
  const closeExportDialog = () => {
    setExportDialogOpen(false);
    setExportPhase("idle");
    setExportProgress({ fetched: 0, target: 0 });
  };

  const handleRangeExport = (count) => {
    if (!isSupAdmin() || isMaskedUser()) {
      toast.error("Export isn't available for your account");
      closeExportDialog();
      return;
    }

    setExportPhase("working");
    setExportProgress({ fetched: 0, target: count });

    fetchLeadsForExport({
      filters: filtersForBackend,
      orderBy: sortConfig?.key,
      order: sortConfig?.direction,
      limit: count,
      onProgress: (fetched, target) => setExportProgress({ fetched, target }),
    })
      .then((rows) => {
        if (!rows.length) {
          toast.error("No leads match the current filters");
          closeExportDialog();
          return;
        }
        exportLeadsToCSV(rows, "leads_export");
        // Fewer than asked for just means the filter doesn't hold that many —
        // show the real number rather than implying a full batch.
        setExportResultCount(rows.length);
        setExportPhase("done");
        // Long enough to read the confirmation, short enough not to need
        // dismissing. The file has already started downloading by here.
        setTimeout(closeExportDialog, 1600);
      })
      .catch((err) => {
        toast.error(err?.message || "Export failed");
        closeExportDialog();
      });
  };

  const handleBulkAction = (action) => {
    if (action === "mass-update") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }

      const editableIds = selectedLeadRecords
        .filter((deal) => canEditRecord("Lead", getPermissionRecord(deal)))
        .map((deal) => deal.id);

      const massUpdateBlock = bulkBlockReason(
        editableIds,
        "Mass Update",
        "edit",
      );
      if (massUpdateBlock) {
        toast.error(massUpdateBlock);
        return;
      }

      setSelectedDeal(null);
      setMode("mass-update");
      setIsDrawerOpen(true);

      return;
    }

    if (action === "export") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }
      // Guarded here as well as on the button: hiding a control is
      // presentation, and this handler is reachable from anything that can
      // dispatch a bulk action.
      if (!isSupAdmin() || isMaskedUser()) {
        toast.error("Export isn't available for your account");
        return;
      }
      if (selectedDeals.length > EXPORT_SELECTION_LIMIT) {
        toast.error(
          `Export up to ${EXPORT_SELECTION_LIMIT} leads at a time — ${selectedDeals.length} selected`,
        );
        return;
      }

      // Fetch the selected records by ID, then build the file from those.
      // The old version filtered `leads`, which only holds the current page —
      // selecting across pages and exporting silently produced a file
      // containing just the visible page. Fetching by id is what makes the
      // full cross-page selection actually reach the CSV.
      const toastId = toast.loading(
        `Preparing ${selectedDeals.length} lead${selectedDeals.length === 1 ? "" : "s"}…`,
      );
      fetchLeadsByIds(selectedDeals)
        .then((rows) => {
          if (!rows.length) {
            toast.error("None of the selected leads could be loaded", {
              id: toastId,
            });
            return;
          }
          exportLeadsToCSV(rows, "selected_leads");
          // A short result means some selected leads no longer exist. Say so
          // rather than handing over a file that's quietly missing rows.
          const missing = selectedDeals.length - rows.length;
          toast.success(
            missing > 0
              ? `Exported ${rows.length} leads (${missing} no longer exist)`
              : `Exported ${rows.length} leads`,
            { id: toastId },
          );
        })
        .catch((err) => {
          toast.error(err?.message || "Export failed", { id: toastId });
        });
      return;
    }

    if (action === "delete") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }

      const deletableIds = selectedLeadRecords
        .filter((deal) => canDeleteRecord("Lead", getPermissionRecord(deal)))
        .map((deal) => deal.id);

      const deleteBlock = bulkBlockReason(deletableIds, "Delete", "delete");
      if (deleteBlock) {
        toast.error(deleteBlock);
        return;
      }

      setShowDeleteConfirm(true);
      return;
    }

    if (action === "stage" || action === "owner") {
      // later mass update drawer
    }
  };
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      return Promise.all(ids.map((id) => deleteLead(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Selected leads deleted");
    },
  });
  const handleConfirmBulkDelete = () => {
    if (!selectedDeals.length) {
      toast.error("No leads selected");
      return;
    }

    const deletableIds = selectedLeadRecords
      .filter((deal) => canDeleteRecord("Lead", getPermissionRecord(deal)))
      .map((deal) => deal.id);

    const confirmBlock = bulkBlockReason(deletableIds, "Delete", "delete");
    if (confirmBlock) {
      toast.error(confirmBlock);
      return;
    }

    toast.loading("Deleting leads...", { id: "bulk-delete" });

    bulkDeleteMutation.mutate(deletableIds, {
      onSuccess: () => {
        toast.success("Selected leads deleted", { id: "bulk-delete" });
        setSelectedDeals([]);
        setShowDeleteConfirm(false);
      },
      onError: () => {
        toast.error("Failed to delete leads", { id: "bulk-delete" });
      },
    });
  };



  const handleItemsPerPageChange = (newItemsPerPage) => {
    setLimit(newItemsPerPage);
    setPage(1);
  };
  const handleBulkUpdateLeads = async (payload) => {
    try {
      const editableIds = selectedLeadRecords
        .filter((deal) => canEditRecord("Lead", getPermissionRecord(deal)))
        .map((deal) => deal.id);

      // Same guard as the Mass Update entry point, so the drawer's submit
      // can't slip past it with a selection that changed while it was open.
      const updateBlock = bulkBlockReason(editableIds, "Mass Update", "edit");
      if (updateBlock) {
        toast.error(updateBlock);
        return;
      }

      toast.loading("Updating leads...", { id: "bulk-update" });

      await Promise.all(editableIds.map((id) => updateLead(id, payload)));

      toast.success(`${editableIds.length} leads updated`, {
        id: "bulk-update",
      });

      // setLeads(data.list);
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      setSelectedDeals([]);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Mass update failed", { id: "bulk-update" });
    }
  };

//redirect to perticular lead (from pipeline DealCard / meeting / etc.)
  const leadIdFromState = location.state?.leadId;

  // Fetch the linked lead BY ID — bypasses pagination & filters so the drawer
  // opens even when the target lead isn't on the first page of `useNewLeads`.
  // Shares its queryKey ["leadDetails", id] with the drawer's own detail
  // fetch, so React Query dedupes — no extra network round-trip.
  const { data: redirectLeadData } = useLeadDetails(leadIdFromState, "view");

  useEffect(() => {
    if (!leadIdFromState || !redirectLeadData) return;

    // Safe comparison — protects against number/string id drift between sources.
    if (String(redirectLeadData.id) === String(leadIdFromState)) {
      setSelectedDeal(redirectLeadData);
      setMode("view");
      setIsDrawerOpen(true);
    }
    // location.key changes on every navigation, so clicking the same lead
    // twice from the pipeline re-opens the drawer instead of being a no-op.
  }, [leadIdFromState, redirectLeadData, location.key]);

  return (
    <>
      <Helmet>
        <title>Leads -CRM</title>
        <meta
          name="description"
          content="Manage and track your sales deals with comprehensive filtering and pipeline management tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background relative isolate">
      <TricolorBurst />
        <Header onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        <main className="lg:ml-64 pt-16">
          <div className="p-4 lg:p-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold heading-gradient">
                  Leads
                </h1>
                <p className="text-muted-foreground mt-1">
                  Track and manage your sales opportunities
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Export — admin only, matching Export Selected. Opens a
                    dialog rather than a dropdown so the export has somewhere
                    to report progress; a menu that closes on click has no
                    room to tell you a 3-request export is halfway done. */}
                {isSupAdmin() && !isMaskedUser() && (
                  <Button
                    className="linearbg-1 text-white hover:text-white"
                    variant="outline"
                    onClick={() => setExportDialogOpen(true)}
                  >
                    <Icon name="Download" size={16} className="mr-2" />
                    Export
                  </Button>
                )}

                <Button
                  onClick={handleAddLeads}
                  className="linearbg-1 text-white hover:text-white"
                >
                  <Icon name="Plus" size={16} className="mr-2" />
                  New Lead
                </Button>
              </div>
            </div>

            {/* Filters */}
            <DealsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={total}
              onBulkAction={handleBulkAction}
              selectedCount={selectedDeals?.length}
              onClearSelection={() => setSelectedDeals([])}
              toggleAnalytics={() => setShowAnalytics((prev) => !prev)}
              total={total}
              limit={limit}
              page={page}
            />
            {/* chartsAnanlysis */}
            {showAnalytics && (
              <div className="bg-card border border-border rounded-lg p-5 mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Lead Analytics</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAnalytics((prev) => !prev)}
                  >
                    <Icon name="X" size={20} />
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* <StatusChart filters={filters} enabled={showAnalytics} /> */}

                  <ProjectChart
                    filters={filtersForBackend}
                    enabled={showAnalytics}
                  />

                  <AssignedUserChart
                    filters={filtersForBackend}
                    enabled={showAnalytics}
                  />
                </div>
              </div>
            )}

            {/* Table + pagination — one rounded card: table is the body,
                pagination is the footer, sharing border/shadow/corners.

                The card itself must NOT be overflow-hidden: the footer's
                "per page" Select renders its menu as an absolutely-positioned
                child, and a clipping context here cut the menu off so it
                couldn't be used. Instead only the table is clipped (it's the
                part whose square corners need rounding), and the footer rounds
                its own bottom corners. */}
            <div className="rounded-2xl border border-[rgba(20,20,30,0.08)] shadow-[0_1px_2px_rgba(16,24,40,.04),0_4px_16px_rgba(16,24,40,.06)]">
              <div
                className={`overflow-hidden ${
                  totalPages > 1 ? "rounded-t-2xl" : "rounded-2xl"
                }`}
              >
                <DealsTable
                  deals={leads}
                  selectedDeals={selectedDeals}
                  onSelectDeal={handleSelectDeal}
                  onSelectAll={handleSelectAll}
                  onDealClick={handleDealClick}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onDelete={handleRequestDeleteLead}
                  onQuickUpdate={handleQuickUpdate}
                  isLoading={isLoading}
                  page={page}
                  setPage={setPage}
                  canEdit={(deal) =>
                    canEditRecord("Lead", getPermissionRecord(deal))
                  }
                  canDelete={(deal) =>
                    canDeleteRecord("Lead", getPermissionRecord(deal))
                  }
                />
              </div>

              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={(p) => setPage(p)}
                onItemsPerPageChange={(val) => {
                  setLimit(val);
                  setPage(1);
                }}
              />
            </div>

            <ExportDialog
              isOpen={exportDialogOpen}
              onClose={closeExportDialog}
              options={EXPORT_RANGE_OPTIONS}
              onPick={handleRangeExport}
              phase={exportPhase}
              progress={exportProgress}
              resultCount={exportResultCount}
            />

            {/* Deal Drawer */}
            <DealDrawer
              status={status}
              industry={industry}
              source={source}
              leadsDetails={leadsDetails}
              deal={selectedDeal}
              mode={mode}
              isOpen={isDrawerOpen}
              onCreate={handleCreateLead}
              onUpdate={handleUpdateLead}
              onClose={handleDrawerClose}
              onDelete={handleDeleteActivity}
              onBulkUpdate={handleBulkUpdateLeads}
              selectedIds={selectedDeals}
            />

            <ConfirmDeleteModal
              open={showDeleteConfirm}
              title="Delete Selected Leads"
              description="These leads and their activity history will be permanently removed."
              recordName={`${selectedDeals.length} lead${selectedDeals.length === 1 ? "" : "s"} selected`}
              confirmLabel={`Delete ${selectedDeals.length}`}
              loading={bulkDeleteMutation.isPending}
              onCancel={() => setShowDeleteConfirm(false)}
              onConfirm={handleConfirmBulkDelete}
            />

            {/* Single-lead delete — same dialog as bulk, named record. */}
            <ConfirmDeleteModal
              open={!!leadToDelete}
              title="Delete Lead"
              description="This lead and its activity history will be permanently removed."
              recordName={leadToDelete?.name}
              loading={deleteLeadMutation.isPending}
              onCancel={() => setLeadToDelete(null)}
              onConfirm={handleConfirmDeleteLead}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default DealsPage;
