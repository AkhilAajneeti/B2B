import React, { useState, useMemo, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";

import TricolorBurst from "../../components/TricolorBurst";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import DealsTable from "./components/DealsTable";
import DealsFilters from "./components/DealsFilters";
import ExportDialog from "./components/ExportDialog";
import DealDrawer from "./components/DealDrawer";
// import Papa from "papaparse"; // only the commented CSV builder below used it
import TablePagination from "./components/TablePagination";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLead,
  createLeadActivity,
  deleteActivity,
  deleteLead,
  updateLead,
  // fetchLeadsByIds is no longer used by the export — kept imported-free on
  // purpose; the service still exports it for the range-export path.
  exportLeadsByIds,
  downloadBlob,
  fetchLeadsForExport,
  fetchAllMatchingLeads,
  EXPORT_DATE_RANGES,
  EXPORT_SELECTION_LIMIT,
  // EXPORT_RANGE_OPTIONS — the parked First 100/250/500 picker. Kept
  // imported-free; uncomment it with the <ExportDialog options=…> line below
  // to put the count picker back.
  // EXPORT_RANGE_OPTIONS,
} from "services/leads.service";
import { ensureStepUp, isCancellation } from "services/stepUp.service";
import { useExportRanges } from "hooks/useExportRanges";
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
  canExportLeads,
  getStoredUser,
  isMaskedUser,
  isSupAdmin,
} from "utils/permission";
import { useLocation, useParams } from "react-router-dom";

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
    // Statuses the lead has PASSED THROUGH (cStatusObj), independent of its
    // current status. Empty array = not filtering on history.
    previousStatus: [],
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
  const [filters, setFilters] = useState(() => {
    const restored = { ...DEFAULT_FILTERS, ...(persisted?.filters || {}) };

    // Restricted accounts don't get the Next Contact filter (see
    // DealsFilters). Clear any stored value for them: filters persist in
    // sessionStorage, so one set before this gate existed — or left by another
    // account on the same machine — would carry on narrowing the list with no
    // visible control to clear it. That reads as "leads are missing", and the
    // only way out would be to clear site data.
    //
    // `assignUser` is deliberately NOT cleared any more: that filter is now
    // shown to these accounts, so a stored value has a visible control and a
    // pill to clear it.
    if (isMaskedUser()) {
      restored.nextContactType = "";
      restored.nextContactFrom = "";
      restored.nextContactTo = "";
      restored.nextContactXDays = "";
    }
    return restored;
  });

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

  /**
   * Records for selections made OFF the current page, via "select all
   * matching".
   *
   * Mass Update and Delete verify permission per record, so an id alone is
   * not enough — without the record they cannot tell whose lead it is, and
   * bulkBlockReason refuses the action rather than guess. Holding the records
   * is what lets a cross-page selection be acted on at all.
   *
   * Export never needed this (it posts ids and the gateway applies the user's
   * own ACL), which is why cross-page export already worked.
   */
  const [offPageRecords, setOffPageRecords] = useState([]);
  const [selectingAll, setSelectingAll] = useState(false);

  // What the last select-all returned: { fetched, total } while one is live,
  // null otherwise. Drives the banner's two summary states — see
  // crossPageSelection / selectionTruncated below for why neither can be
  // derived from the selection itself.
  const [selectAllRun, setSelectAllRun] = useState(null);

  const selectedLeadRecords = useMemo(() => {
    // Current page WINS over the cached copy: the page is the fresher read,
    // so a lead reassigned since the select-all is judged on its new owner.
    const byId = new Map();
    offPageRecords.forEach((lead) => lead?.id && byId.set(lead.id, lead));
    leads.forEach((lead) => lead?.id && byId.set(lead.id, lead));
    return selectedDeals.map((id) => byId.get(id)).filter(Boolean);
  }, [leads, offPageRecords, selectedDeals]);
  const source = metaData?.sources || [];
  const status = metaData?.status || [];
  const industry = metaData?.industries || [];
  const total = leadsData?.total || 0;
  // BROWSER-BUILT CSV — unused since 2026-11-25. Both exports (Export All and
  // Export Selected) now go through /Export, so the server builds the file and
  // nothing is assembled in the tab. Commented rather than deleted: it is the
  // fallback if the gateway ever stops proxying /Export, and it is the only
  // thing here that can produce a CSV, since the server route returns xlsx.
  /*
  // Lead export was switched off on 2026-11-18 and restored on 2026-11-23, by
  // request, with the original role gates intact: the only account barred
  // outright is the restricted one (`isMaskedUser()`), and the buttons stay
  // elevated-only as they were.
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
  */

  /**
   * Export progress, shown in the ExportDialog rather than a toast.
   *
   * `count` is what the dialog reports; `phase` drives its three states. A
   * failure CLOSES the dialog and falls back to an error toast — leaving a
   * card on screen that says "preparing" while nothing is happening is worse
   * than no card, and the error text is long enough to want the width a toast
   * gives it.
   */
  /**
   * Export state. `stage` is what the card is doing, `phase` is what the
   * dialog renders:
   *
   *   pick     phase "idle"     — the 100 / 250 / 500 picker
   *   collect  phase "working"  — REAL progress, paging the CRM for ids
   *   build    phase "working"  — indeterminate, the server builds the file
   *            phase "done"     — briefly, then closes itself
   *
   * The two working stages are deliberately told apart. Collecting reports
   * true progress because it pages 200 at a time and knows the target;
   * building is one request that either returns a file or does not, so a
   * percentage there would be invented.
   */
  const [exportState, setExportState] = useState({
    open: false,
    phase: "idle",
    stage: "pick",
    count: 0,
    progress: { fetched: 0, target: 0 },
  });

  // The done state lingers so it can be read, then closes itself. Tracked in
  // a ref so leaving the page mid-export doesn't set state on an unmounted
  // component.
  const exportTimer = useRef(null);
  useEffect(() => () => clearTimeout(exportTimer.current), []);

  /**
   * One path for both buttons: Export All sends the page's ids, Export
   * Selected sends the ticked ones, and everything after that is identical.
   *
   * THE "PREPARING YOUR FILE" CARD IS NOT SHOWN YET. /Export is step-up
   * protected, so exportLeadsByIds may first put up the verification dialog,
   * and a progress card promising a file while the person is being asked for
   * a code reads as two things happening at once. ensureStepUp() returns
   * immediately for an already-elevated session, so in the common case this
   * costs nothing.
   */
  const runExport = (ids, fileName, format = "csv") => {
    clearTimeout(exportTimer.current);

    ensureStepUp()
      .then(() => {
        setExportState({ open: true, phase: "working", count: ids.length });
        return exportLeadsByIds(ids, { format });
      })
      .then((blob) => {
        const stamp = new Date().toISOString().split("T")[0];
        downloadBlob(blob, `${fileName}_${stamp}.${format}`);
        setExportState({ open: true, phase: "done", count: ids.length });
        exportTimer.current = setTimeout(
          () => setExportState((prev) => ({ ...prev, open: false })),
          1800,
        );
      })
      .catch((err) => {
        setExportState({
          open: false,
          phase: "idle",
          stage: "pick",
          count: 0,
          progress: { fetched: 0, target: 0 },
        });
        // A cancelled verification is a decision, not a failure. "Export
        // failed" after someone deliberately closed the dialog reads as a
        // bug and invites them to try again.
        if (isCancellation(err)) return;
        toast.error(err?.message || "Export failed");
      });
  };

  /**
   * The picker's rows. Counts are fetched only while the dialog is open on
   * the pick stage — four small requests, and none at all if nobody opens it.
   */
  const { options: exportRangeOptions, counts: exportRangeCounts } =
    useExportRanges({
      filters: filtersForBackend,
      enabled: exportState.open && exportState.stage === "pick",
    });

  const closeExport = () =>
    setExportState({
      open: false,
      phase: "idle",
      stage: "pick",
      count: 0,
      progress: { fetched: 0, target: 0 },
    });

  /**
   * The picker answer: export the first N leads matching the CURRENT FILTER
   * AND SORT — not the page on screen.
   *
   * This is why the picker is back. Export All handed back exactly one page,
   * so pulling 500 leads meant visiting five pages and exporting five times,
   * then stitching the files together by hand.
   *
   * `filtersForBackend` is passed, NOT the raw `filters`: it is the same
   * object the table's own query uses, so the export cannot drift from what
   * the person is looking at. It also carries the restricted-account scoping
   * and the hidden-status exclusion, which raw `filters` does not.
   *
   * TWO STEPS, and the dialog says which is which. First page the CRM for the
   * ids (real progress), then POST those ids to /Export and let the server
   * build the file (indeterminate). Step-up is asked for ONCE, up front —
   * verifying after a 40-second collection would be a poor trade.
   */
  const handlePickRange = (rangeKey) => {
    const range = EXPORT_DATE_RANGES.find((r) => r.key === rangeKey);
    if (!range) return;

    // The count the row showed. Used as the collection target so the progress
    // bar counts toward what is actually there — asking for the 500 cap when
    // the range holds 83 would park the bar at 17% and then jump to done.
    // Unknown (a count that failed) falls back to the cap.
    const known = exportRangeCounts[rangeKey];
    const target =
      typeof known === "number" && known > 0
        ? Math.min(known, EXPORT_SELECTION_LIMIT)
        : EXPORT_SELECTION_LIMIT;

    clearTimeout(exportTimer.current);

    ensureStepUp()
      .then(() => {
        setExportState({
          open: true,
          phase: "working",
          stage: "collect",
          count: target,
          progress: { fetched: 0, target },
        });
        return fetchLeadsForExport({
          // The range's dateType REPLACES any date already set in the filter
          // bar: the two answer the same question, and the picker is the more
          // recent instruction. Every other filter is kept, so "This month"
          // means this month within what is on screen.
          filters: { ...filtersForBackend, dateType: range.dateType },
          orderBy: sortConfig?.key,
          order: sortConfig?.direction,
          limit: target,
          onProgress: (fetched, target) =>
            setExportState((prev) => ({ ...prev, progress: { fetched, target } })),
        });
      })
      .then((rows) => {
        const ids = (rows || []).map((row) => row?.id).filter(Boolean);
        // A filter that matches nothing is not a failure, but it has no file
        // either — say so rather than downloading an empty sheet.
        if (!ids.length) throw new Error("No leads match the current filter");

        // `count` becomes what was ACTUALLY found. Asking for 500 and finding
        // 83 should report 83, not keep promising 500.
        setExportState((prev) => ({ ...prev, stage: "build", count: ids.length }));
        return exportLeadsByIds(ids, { format: "csv" });
      })
      .then((blob) => {
        const stamp = new Date().toISOString().split("T")[0];
        // The range is in the FILENAME, so a folder of exports stays
        // readable without opening them.
        downloadBlob(blob, `leads_${range.key}_${stamp}.csv`);
        setExportState((prev) => ({ ...prev, phase: "done" }));
        exportTimer.current = setTimeout(
          () => setExportState((prev) => ({ ...prev, open: false })),
          1800,
        );
      })
      .catch((err) => {
        closeExport();
        if (isCancellation(err)) return;
        toast.error(err?.message || "Export failed");
      });
  };

  /**
   * Export All — the leads currently on screen, built by the SERVER.
   *
   * Same rows as before: `leads` is the current page, so the file still holds
   * exactly what the table is showing, at whatever page size is set. What
   * changed is only who builds it — the ids go to /Export and the file comes
   * back, instead of the browser assembling a CSV from data it already had.
   *
   * CSV, by request.
   *
   * KNOWN COST, accepted deliberately: `cPreference` holds multi-line values
   * — "Select Your Preference: …" then "What's your availability …" on the
   * next line — and a CSV field containing a line break only survives if the
   * writer quotes it. The server does not, so Excel ends the row at the break
   * and everything after the first line is lost. xlsx does not have this
   * problem because a line break is simply part of the cell.
   *
   * The browser-built CSV could have quoted it on the way out; the
   * server-built one is not ours to fix. Either ask the backend to quote
   * fields containing newlines, or pass "xlsx" to runExport below.
   *
   * The gateway applies the user's own ACL to the contents either way, which
   * a file built in the tab never could.
   *
   * The label still overstates it: this is the page, not everything matching
   * the filter. Exporting the whole filtered set needs a `where` body rather
   * than ids, and that shape is not confirmed against this gateway yet — a
   * filter the backend does not recognise exports EVERYTHING rather than
   * failing, which is a worse outcome than the label being imprecise.
   */
  const handleExportAll = () => {
    if (!canExportLeads()) {
      toast.error("Export isn't available for your account");
      return;
    }

    setExportState({
      open: true,
      phase: "idle",
      stage: "pick",
      count: 0,
      progress: { fetched: 0, target: 0 },
    });
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
    // An "add" drawer must never sit on a /leads/:id URL — that link would
    // reopen someone else's lead.
    syncLeadUrl(null);
  };

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setMode("view");
    setIsDrawerOpen(true);
    // Open from the row data we already hold — instant — and put the id on the
    // URL so the open lead is shareable. No fetch, no navigation.
    syncLeadUrl(deal?.id);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedDeal(null);
    syncLeadUrl(null);
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

  /**
   * Remember the records behind a selection, so they survive leaving the page.
   *
   * Ticking a lead on page 1 and then paging to 2 used to leave only an id:
   * `leads` no longer holds that record, so Mass Update and Delete could not
   * check whose lead it was and refused the whole selection. Keeping the
   * record alongside the id is what makes a hand-built cross-page selection
   * work the same as "select all matching".
   *
   * Nothing is pruned on deselect — selectedLeadRecords is driven by
   * selectedDeals, so an unticked lead drops out regardless, and re-ticking it
   * after paging away still finds its record here.
   */
  const rememberRecords = (records) => {
    setOffPageRecords((prev) => {
      const byId = new Map(prev.map((lead) => [lead.id, lead]));
      records.forEach((lead) => lead?.id && byId.set(lead.id, lead));
      return [...byId.values()];
    });
  };

  const handleSelectDeal = (dealId, isSelected) => {
    if (isSelected) {
      const record = leads.find((lead) => lead.id === dealId);
      if (record) rememberRecords([record]);
      setSelectedDeals([...selectedDeals, dealId]);
    } else {
      setSelectedDeals(selectedDeals?.filter((id) => id !== dealId));
    }
  };

  const handleSelectAll = (isSelected) => {
    const currentPageDeals = leads.map((deal) => deal.id);

    if (isSelected) {
      rememberRecords(leads);
      setSelectedDeals([...new Set([...selectedDeals, ...currentPageDeals])]);
    } else {
      setSelectedDeals(
        selectedDeals.filter((id) => !currentPageDeals.includes(id))
      );
    }
  };

  /**
   * Select every lead matching the current filter, not just this page.
   *
   * REFUSES ABOVE THE CAP rather than taking the first 500. A selection
   * labelled "all 1,200" that holds 500 is the same failure the page-bound
   * export used to have: the number on screen is right, the thing it acts on
   * is not, and nothing says so.
   *
   * The records are fetched, not just the ids, so Mass Update and Delete can
   * still check permission per record — see offPageRecords above.
   */
  const handleSelectAllMatching = async () => {
    if (!total) return;

    // TRUNCATES, IT DOES NOT REFUSE. Over the cap this takes the newest
    // EXPORT_SELECTION_LIMIT in the current sort — the same thing the header
    // Export does with an over-cap date range ("exports the newest 500"), so
    // the two controls can't give contradictory answers about the same filter.
    // The banner has already named the number, so this is not a surprise.
    const target = Math.min(total, EXPORT_SELECTION_LIMIT);

    const toastId = "select-all-matching";
    setSelectingAll(true);
    toast.loading(`Selecting ${target.toLocaleString()} leads…`, { id: toastId });

    try {
      const records = await fetchAllMatchingLeads({
        filters: filtersForBackend,
        orderBy: sortConfig?.key,
        order: sortConfig?.direction,
        limit: EXPORT_SELECTION_LIMIT,
      });

      setOffPageRecords(records);
      setSelectedDeals(records.map((lead) => lead.id).filter(Boolean));
      setSelectAllRun({ fetched: records.length, total });

      // "of 1,240" whenever it came back short, so the count on screen is
      // never read as the whole filter. "the maximum" is claimed only when the
      // cap is what stopped it — a fetch that returned 480 of 1,240 was
      // limited by the data, not by the cap, and saying otherwise would send
      // the user off to narrow a filter that would not help.
      toast.success(
        records.length < total
          ? `${records.length.toLocaleString()} of ${total.toLocaleString()} leads selected${
              records.length >= EXPORT_SELECTION_LIMIT ? " — the maximum" : ""
            }`
          : `${records.length.toLocaleString()} leads selected`,
        { id: toastId },
      );
    } catch (err) {
      toast.error(err?.message || "Could not select all leads", { id: toastId });
    } finally {
      setSelectingAll(false);
    }
  };

  /**
   * The selection restricted to THIS PAGE — what Delete acts on.
   *
   * Cross-page selection was built for Mass Update and Export. Delete is
   * deliberately excluded: it is irreversible, and "select all 300, then
   * delete" is one mis-click away from emptying a filter. Keeping it
   * page-bound means the rows it destroys are the rows that were on screen
   * when the button was pressed.
   *
   * Scoped here rather than by hiding the action, so the limit holds however
   * the delete is reached.
   */
  const pageLeadRecords = useMemo(
    () => leads.filter((lead) => selectedDeals.includes(lead.id)),
    [leads, selectedDeals],
  );

  const clearSelection = () => {
    setSelectedDeals([]);
    setOffPageRecords([]);
    setSelectAllRun(null);
  };

  // The whole visible page is ticked AND there is more beyond it. Both halves
  // matter: without the second, the banner would offer to "select all 12" on
  // a filter whose 12 results are already entirely on screen.
  const pageFullySelected =
    leads.length > 0 &&
    leads.every((lead) => selectedDeals.includes(lead.id)) &&
    total > leads.length;

  const allMatchingSelected =
    selectedDeals.length > 0 && selectedDeals.length >= total;

  // The filter holds more than one selection can carry, so select-all will
  // TRUNCATE to the newest EXPORT_SELECTION_LIMIT rather than refuse. The
  // banner says so before the click — the old behaviour offered "Select all
  // 1,240", then rejected it with a toast, which is a button that lies.
  const selectionCapped = total > EXPORT_SELECTION_LIMIT;

  // The select-all TRUNCATED: it returned fewer than the filter holds. Read
  // from what the fetch actually came back with, not from
  // `selectedDeals.length >= EXPORT_SELECTION_LIMIT` — that comparison was
  // the second bug here. A fetch that yields 480 of 1,240 (ACL trimming the
  // result, or a short page) failed it, so the banner reverted to "all 20 on
  // this page are selected" and re-offered a select-all that had already run
  // and would return the same 480: a loop with no exit.
  //
  // Shown as its own state because `allMatchingSelected` is false here — 500
  // is not 1,240 — so without it there is nothing to report the cap at all.
  const selectionTruncated =
    Boolean(selectAllRun) && selectAllRun.fetched < selectAllRun.total;

  // A select-all actually ran. Tracked as its own state rather than inferred
  // from `offPageRecords`, which was the first attempt and was simply wrong:
  // rememberRecords() fills that array on every MANUAL tick too (see
  // handleSelectDeal / handleSelectAll), so the proxy was true whenever
  // anything was selected at all — which put the banner on single-page
  // filters, announcing a select-all that never happened.
  const crossPageSelection = Boolean(selectAllRun);

  // Kept visible once a cross-page selection exists, not just while the page
  // is fully ticked: paging past the selected range used to hide the banner
  // and with it the only "Clear selection" the summary states offer.
  const showSelectionBanner =
    pageFullySelected ||
    (crossPageSelection && (allMatchingSelected || selectionTruncated));

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
    // The cached off-page records go too: they were fetched against the OLD
    // filter, so keeping them would let a later bulk action be judged on
    // records that no longer match what is on screen.
    setOffPageRecords([]);
    // The select-all it described is over too: its counts were taken against
    // the old filter, so leaving it set would have the banner report a cap on
    // a result set that no longer exists.
    setSelectAllRun(null);
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
  // THIS ONE IS MASS UPDATE'S. Delete has its own (deleteBlockReason below)
  // because the two no longer follow the same rule.
  //
  // Mass Update verifies permission per record, so it needs the RECORD, not
  // just the id. It used to be refused outright on any selection spanning
  // pages, because `selectedLeadRecords` was `leads.filter(...)` and `leads`
  // is only ever the current page. It now works across pages: every selection
  // path keeps the records it selected (rememberRecords, and
  // fetchAllMatchingLeads for "select all matching").
  //
  // The off-page branch below is KEPT as the fail-closed net rather than
  // deleted. If a record is ever missing — a cache cleared mid-flow, a lead
  // deleted underneath the selection — the action is refused instead of
  // running on a partial set. What was wrong before was saying "you don't
  // have permission", which sent people hunting through roles for a problem
  // that did not exist.
  //
  // Export never needed any of this — it sends ids to the CRM and the gateway
  // applies the user's own ACL, so it does not call this helper at all.
  /**
   * Delete's own refusal, because its rule is now different from Mass Update's.
   *
   * Mass Update follows a cross-page selection; Delete does not. So a
   * selection spanning pages is not an error here — it is simply narrowed to
   * the page, and the message says exactly how many that leaves rather than
   * letting someone press Delete expecting 300 and get 25.
   */
  const deleteBlockReason = (allowedIds) => {
    const offPage = selectedDeals.length - pageLeadRecords.length;
    if (offPage > 0) {
      return `${selectedDeals.length} leads are selected across pages, but Delete only ever acts on the page you are viewing (${pageLeadRecords.length} here). Open each page to delete, or narrow the filter.`;
    }
    if (!allowedIds.length || allowedIds.length !== selectedDeals.length) {
      return "Select only leads you have permission to delete";
    }
    return null;
  };

  const bulkBlockReason = (allowedIds, actionLabel, permissionVerb) => {
    const offPage = selectedDeals.length - selectedLeadRecords.length;
    if (offPage > 0) {
      return `${selectedDeals.length} leads selected across pages — ${actionLabel} works one page at a time (${selectedLeadRecords.length} on this page).`;
    }
    if (!allowedIds.length || allowedIds.length !== selectedDeals.length) {
      return `Select only leads you have permission to ${permissionVerb}`;
    }
    return null;
  };

  // Export the first N matching the current filter + sort. No selection
  // involved — this is the "I want the top 500 of what I'm looking at" case,
  // which ticking checkboxes across five pages served badly.
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
      syncLeadUrl(null);

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
      if (!canExportLeads()) {
        toast.error("Export isn't available for your account");
        return;
      }
      if (selectedDeals.length > EXPORT_SELECTION_LIMIT) {
        toast.error(
          `Export up to ${EXPORT_SELECTION_LIMIT} leads at a time — ${selectedDeals.length} selected`,
        );
        return;
      }

      // SERVER-SIDE EXPORT. The browser used to fetch every selected record
      // (fetchLeadsByIds, paged, sequential) and assemble a CSV from them;
      // now one POST produces the file and we download it. Nothing streams
      // through the tab, and the result is xlsx, so phone numbers arrive as
      // typed cells with their leading zeros rather than needing the quoting
      // hack the CSV builder uses.
      //
      // Reported counts are gone with it, and that is the honest trade: the
      // server decides what the file contains, so "3 of your 10 no longer
      // exist" is no longer something the client can know. It also applies
      // the user's own ACL, which the client-side path could not.
      runExport(selectedDeals, "selected_leads", "csv");
      return;
    }

    if (action === "delete") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }

      // PAGE-SCOPED ON PURPOSE — see pageLeadRecords. Delete does not follow
      // a cross-page selection the way Mass Update and Export do.
      const deletableIds = pageLeadRecords
        .filter((deal) => canDeleteRecord("Lead", getPermissionRecord(deal)))
        .map((deal) => deal.id);

      const deleteBlock = deleteBlockReason(deletableIds);
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

    const deletableIds = pageLeadRecords
      .filter((deal) => canDeleteRecord("Lead", getPermissionRecord(deal)))
      .map((deal) => deal.id);

    const confirmBlock = deleteBlockReason(deletableIds);
    if (confirmBlock) {
      toast.error(confirmBlock);
      return;
    }

    toast.loading("Deleting leads...", { id: "bulk-delete" });

    bulkDeleteMutation.mutate(deletableIds, {
      onSuccess: () => {
        toast.success("Selected leads deleted", { id: "bulk-delete" });
        clearSelection();
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

      clearSelection();
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Mass update failed", { id: "bulk-update" });
    }
  };

//redirect to perticular lead (from pipeline DealCard / meeting / etc.)
  const leadIdFromState = location.state?.leadId;

  // URL deep-link — /leads/:leadId opens that lead's drawer, so a lead can be
  // shared or bookmarked and survives a refresh.
  const { leadId: leadIdFromUrl } = useParams();

  // Either source opens the same drawer; the URL wins when both are present.
  const targetLeadId = leadIdFromUrl || leadIdFromState;

  /**
   * Write the lead id onto the address bar WITHOUT routing.
   *
   * Deliberately history.replaceState and not navigate(). react-router-dom is
   * pinned at 6.0.2, where optional params (":leadId?") do not exist, so
   * /leads and /leads/:leadId have to be two separate <Route> entries — and
   * navigating between them risks remounting this page. That would throw away
   * the filters, the current page, the sort AND the cross-page checkbox
   * selection, which is a far worse bug than the one a shareable URL solves.
   *
   * replaceState changes the bar only: no route match, no remount, nothing
   * reset. The /leads/:leadId route above still exists so a pasted link
   * resolves on a cold load.
   *
   * The trade-off, stated plainly: because this replaces rather than pushes,
   * the browser Back button does not close the drawer. Closing it is the
   * drawer's own X / overlay, as before.
   */
  const syncLeadUrl = (id) => {
    try {
      window.history.replaceState(null, "", id ? `/leads/${id}` : "/leads");
    } catch {
      /* history blocked (rare, e.g. sandboxed iframe) — the drawer still works */
    }
  };

  // Fetch the linked lead BY ID — bypasses pagination & filters so the drawer
  // opens even when the target lead isn't on the first page of `useNewLeads`.
  // Shares its queryKey ["leadDetails", id] with the drawer's own detail
  // fetch, so React Query dedupes — no extra network round-trip.
  const { data: redirectLeadData } = useLeadDetails(targetLeadId, "view");

  useEffect(() => {
    if (!targetLeadId || !redirectLeadData) return;

    // Safe comparison — protects against number/string id drift between sources.
    if (String(redirectLeadData.id) === String(targetLeadId)) {
      setSelectedDeal(redirectLeadData);
      setMode("view");
      setIsDrawerOpen(true);
    }
    // location.key changes on every navigation, so clicking the same lead
    // twice from the pipeline re-opens the drawer instead of being a no-op.
  }, [targetLeadId, redirectLeadData, location.key]);

  return (
    <>
      <Helmet>
        <meta
          name="description"
          content="Manage and track your sales deals with comprehensive filtering and pipeline management tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background relative">
      <TricolorBurst />
        
        

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
                {/* ───────────────────────────────────────────────────────────
                    Export opens the range picker. Visible
                    to elevated users: admin (by type) or the Owner / Manager
                    roles. Narrowing this to admin-only locked Owners out,
                    which was a regression rather than an intent.

                    The !isMaskedUser() half is what keeps the restricted
                    `aajneeti` account out, and it is the reason this button
                    can come back without reopening lead data to that account:
                    a named account outranks any role it is given, so making
                    it an Owner would not quietly undo the block. The same
                    guard is repeated inside the export handlers, because
                    hiding a button is presentation, not permission.

                    IT NO LONGER EXPORTS ONE PAGE. The button opens the range
                    picker (First 100 / 250 / 500 from the current filter and
                    sort), which is why it is labelled "Export" rather than
                    "Export All" — the old label promised everything and
                    delivered a page, and the fix was to stop exporting a page
                    rather than to keep apologising for it in a comment.
                    ───────────────────────────────────────────────────────── */}
                {canExportLeads() && (
                  <Button
                    className="linearbg-1 text-white hover:text-white"
                    variant="outline"
                    onClick={handleExportAll}
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

            {/* One dialog for the whole export: the picker, then both
                working stages, then the result. Its wording follows `stage`
                so the card never claims to be doing something it is not. */}
            <ExportDialog
              isOpen={exportState.open}
              phase={exportState.phase}
              options={exportRangeOptions}
              onPick={handlePickRange}
              progress={exportState.progress}
              resultCount={exportState.count}
              indeterminate={exportState.stage === "build"}
              title={
                exportState.stage === "build"
                  ? "Preparing your file"
                  : "Export leads"
              }
              subtitle={
                exportState.stage === "build"
                  ? "The server is building the spreadsheet"
                  : "Pick a date range from the current filter"
              }
              busyLabel={
                exportState.stage === "build"
                  ? "Preparing your file…"
                  : "Collecting leads…"
              }
              onClose={closeExport}
            />

            {/* Filters */}
            <DealsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={total}
              onBulkAction={handleBulkAction}
              selectedCount={selectedDeals?.length}
              onClearSelection={clearSelection}
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
            {/* CROSS-PAGE SELECT ALL — three states.
                The OFFER appears once the whole page is ticked, which is the
                moment the limit becomes visible; offering it before then
                would be a second select-all control competing with the
                header checkbox, and it stays hidden when the filter fits on
                one page, where it would do nothing. The two SUMMARY states
                (all selected / capped at the limit) also survive paging away
                from the selected range, since they carry the only Clear
                selection those states offer. */}
            {showSelectionBanner && (
              <div className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-[#AC2334]/20 bg-[#AC2334]/[0.06] px-4 py-2.5 text-sm text-foreground">
                {selectionTruncated ? (
                  <>
                    <span>
                      <strong>{selectedDeals.length.toLocaleString()}</strong> of{" "}
                      {total.toLocaleString()} leads selected
                      {selectAllRun.fetched >= EXPORT_SELECTION_LIMIT
                        ? " — the most that can be selected at once."
                        : "."}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-semibold text-[#AC2334] underline underline-offset-2 hover:opacity-80"
                    >
                      Clear selection
                    </button>
                  </>
                ) : allMatchingSelected ? (
                  <>
                    <span>
                      All <strong>{selectedDeals.length.toLocaleString()}</strong>{" "}
                      leads matching this filter are selected.
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="font-semibold text-[#AC2334] underline underline-offset-2 hover:opacity-80"
                    >
                      Clear selection
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      All <strong>{leads.length}</strong> leads on this page are
                      selected.
                      {/* Stated BEFORE the click, not as a toast after it. The
                          cap is a property of the filter, so the user can act
                          on it here — narrow the filter — while the old toast
                          only told them the click had failed. */}
                      {selectionCapped && (
                        <>
                          {" "}
                          This filter matches{" "}
                          <strong>{total.toLocaleString()}</strong>, and only{" "}
                          {EXPORT_SELECTION_LIMIT} can be selected at once.
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllMatching}
                      disabled={selectingAll}
                      className="font-semibold text-[#AC2334] underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
                    >
                      {selectingAll
                        ? "Selecting…"
                        : selectionCapped
                          ? // "first", not "newest": the fetch follows the
                            // CURRENT sort, so under Name A→Z these are the
                            // first 500 alphabetically. Newest only by
                            // default (createdAt desc).
                            `Select the first ${EXPORT_SELECTION_LIMIT} of ${total.toLocaleString()}`
                          : `Select all ${total.toLocaleString()} matching this filter`}
                    </button>
                  </>
                )}
              </div>
            )}

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
