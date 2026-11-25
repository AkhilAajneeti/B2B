import React, { useEffect, useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
// Papa drove the browser-built CSV, now parked below. Kept commented with it
// so restoring that path is one uncomment rather than a re-import.
// import Papa from "papaparse";

import Button from "../../components/ui/Button";
import Icon from "../../components/AppIcon";
import DealsTable from "../deals/components/DealsTable";
import DealsFilters from "../deals/components/DealsFilters";
import DealDrawer from "../deals/components/DealDrawer";
import TablePagination from "../deals/components/TablePagination";
import ConfirmDeleteModal from "../deals/components/ConfirmDeleteModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteLead,
  updateLead,
  exportLeadsByIds,
  downloadBlob,
  fetchLeadsForExport,
  EXPORT_DATE_RANGES,
  EXPORT_SELECTION_LIMIT,
  // EXPORT_RANGE_OPTIONS — the parked First 100/250/500 picker. Kept
  // imported-free; uncomment it with the <ExportDialog options=…> line below
  // to put the count picker back.
  // EXPORT_RANGE_OPTIONS,
} from "services/leads.service";
import { ensureStepUp, isCancellation } from "services/stepUp.service";
import { useExportRanges } from "hooks/useExportRanges";
import ExportDialog from "../deals/components/ExportDialog";
import { useNewLeads } from "hooks/useLeads";
import { useMetaData } from "hooks/useMetaData";
import { useLeadDetails } from "hooks/useLeadDetails";
import { useUsers } from "hooks/useUsers";
import { useTeamUsers } from "hooks/useTeams";
import {
  canEditRecord,
  canDeleteRecord,
  isMaskedUser,
  isSupAdmin,
  canExportLeads,
} from "utils/permission";

/**
 * Inactive Leads — an independent page that surfaces ONLY the inactive / lost
 * leads so they can be reviewed or re-assigned. It reuses the Leads section's
 * exact fetch pattern (useNewLeads -> fetchNewLeads -> whereGroup `status IN`)
 * and the same table + drawer + filters UI, with the status ALWAYS constrained
 * to the statuses below. Nothing in the Leads section is modified — its
 * components are only imported.
 */
const INACTIVE_STATUSES = [
  "Broker",
  "Dead",
  "Low Budget",
  "Duplicate",
  "Invalid Number",
  "Irrelevant Lead",
  "Fake Lead"
];

// Only these statuses are meaningful here, so the filter dropdown offers just
// them (not the full active-lead status list).
const INACTIVE_STATUS_OPTIONS = INACTIVE_STATUSES.map((s) => ({
  value: s,
  label: s,
}));

const DEFAULT_FILTERS = {
  search: "",
  status: [],
  previousStatus: [],
  sector: "",
  cProject: "",
  // Set when the project was picked from the dropdown (see DealsFilters).
  cProjectRef: null,
  source: "",
  assignUser: "",
  team: "",
  dateType: "",
  closeDateFrom: "",
  closeDateTo: "",
  xDays: "",
};

const InactiveLeadsPage = () => {
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [mode, setMode] = useState("view");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Team filter → resolve the team's members, same as the Leads page.
  const { data: filterTeamUsersData } = useTeamUsers(filters.team);
  const filterTeamUserIds = useMemo(
    () =>
      filters.team ? (filterTeamUsersData?.list || []).map((u) => u.id) : null,
    [filters.team, filterTeamUsersData],
  );

  // Status is ALWAYS constrained to the inactive set. If the rep narrows to
  // specific statuses, keep only the inactive ones they picked; otherwise show
  // all inactive. Everything else (search / source / project / user / team /
  // date) filters within that scope exactly like the Leads page.
  const filtersForBackend = useMemo(() => {
    const base =
      filters.team && filterTeamUserIds !== null
        ? { ...filters, _teamUserIds: filterTeamUserIds }
        : { ...filters };
    const pickedInactive = (filters.status || []).filter((s) =>
      INACTIVE_STATUSES.includes(s),
    );
    base.status = pickedInactive.length > 0 ? pickedInactive : INACTIVE_STATUSES;
    return base;
  }, [filters, filterTeamUserIds]);

  // Same fix as the Leads page — without these the sort arrows were inert.
  const { data: leadsData, isLoading } = useNewLeads({
    limit,
    page,
    filters: filtersForBackend,
    orderBy: sortConfig?.key,
    order: sortConfig?.direction,
  });
  const { data: metaData } = useMetaData();
  const { data: leadsDetails } = useLeadDetails(selectedDeal?.id, mode);
  const { data: usersData } = useUsers();

  const leads = leadsData?.list || [];
  const total = leadsData?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;
  const source = metaData?.sources || [];
  const status = metaData?.status || [];
  const industry = metaData?.industries || [];

  const usersById = useMemo(
    () =>
      (usersData?.list || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {}),
    [usersData],
  );

  const selectedLeadRecords = useMemo(
    () => leads.filter((lead) => selectedDeals.includes(lead.id)),
    [leads, selectedDeals],
  );

  // Enrich a lead with its assigned user's teams so team-scoped edit/delete
  // checks resolve correctly (mirrors the Leads page's getPermissionRecord).
  const getPermissionRecord = (lead) => {
    const assignedUser = usersById[lead?.assignedUserId];
    if (!assignedUser) return lead;
    return {
      ...lead,
      teamsIds: lead?.teamsIds?.length
        ? lead.teamsIds
        : assignedUser.teamsIds?.length
          ? assignedUser.teamsIds
          : assignedUser.teamIds?.length
            ? assignedUser.teamIds
            : assignedUser.defaultTeamId
              ? [assignedUser.defaultTeamId]
              : lead?.teamsIds,
    };
  };

  /*
   * PARKED — the browser-built CSV this page used to export.
   *
   * Replaced by the server route below, for the same reasons as the Leads
   * page: the gateway applies the user's own ACL to the file's contents, which
   * a CSV assembled in the tab never could, and /Export is step-up protected
   * so the export now needs a fresh verification code. While this ran, someone
   * who cancelled the verification dialog on Leads could still pull the same
   * contact data out from here — the one hole left in the step-up story.
   *
   * Not dead code: it is the fallback if the gateway ever stops proxying
   * /Export, and it is the only version that QUOTES fields, so it is also the
   * reference for the cPreference line-break problem noted on the Leads page.
   *
  const exportLeadsToCSV = (rows, fileName = "inactive_leads") => {
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
      Source: lead?.source || "",
      "Project Name": lead?.cProject || lead?.cProjectName || "",
      "Assigned User": lead?.assignedUserName || "",
      "Next Contact": lead?.cNextContact || "",
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
   * Export progress. Same card and same three phases as the Leads page — a
   * failure closes it and falls back to an error toast rather than leaving
   * "preparing" on screen over nothing.
   */
  /**
   * Export state. `stage` is what is happening, `phase` is what the dialog
   * renders — pick (idle) → collect (working, real progress) → build
   * (working, indeterminate) → done. Mirrors the Leads page exactly; see the
   * longer note there.
   */
  const [exportState, setExportState] = useState({
    open: false,
    phase: "idle",
    stage: "pick",
    count: 0,
    progress: { fetched: 0, target: 0 },
  });

  // Tracked in a ref so leaving the page mid-export cannot set state on an
  // unmounted component.
  const exportTimer = useRef(null);
  useEffect(() => () => clearTimeout(exportTimer.current), []);

  /**
   * One path for both buttons, lifted from the Leads page so the two cannot
   * drift: Export All sends the page's ids, the bulk action sends the ticked
   * ones, and the server builds the file.
   *
   * The progress card is NOT shown until the verification resolves — /Export
   * is step-up protected, and a card promising a file while the person is
   * being asked for a code reads as two things happening at once.
   *
   * The masked-user guard stays HERE rather than only on the button, so the
   * bulk "export selected" action cannot reach it either — same reasoning as
   * the parked version above.
   */
  const runExport = (ids, fileName, format = "csv") => {
    if (isMaskedUser()) {
      toast.error("Export isn't available for your account");
      return;
    }
    if (!ids.length) {
      toast.error("No data to export");
      return;
    }

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
        closeExport();
        // A cancelled verification is a decision, not a failure.
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
   * Export the first N INACTIVE leads matching the current filter and sort.
   *
   * `filtersForBackend` carries the INACTIVE_STATUSES constraint this page is
   * built on, so the picker cannot reach an active lead — passing the raw
   * `filters` would export the whole pipeline from a page that only ever
   * shows the dead end of it.
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

    if (isMaskedUser()) {
      toast.error("Export isn't available for your account");
      return;
    }

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
        if (!ids.length) throw new Error("No leads match the current filter");
        setExportState((prev) => ({ ...prev, stage: "build", count: ids.length }));
        return exportLeadsByIds(ids, { format: "csv" });
      })
      .then((blob) => {
        const stamp = new Date().toISOString().split("T")[0];
        // The range is in the FILENAME, so a folder of exports stays
        // readable without opening them.
        downloadBlob(blob, `inactive_leads_${range.key}_${stamp}.csv`);
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

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      toast.success("Lead deleted", { id: "delete-lead" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setLeadToDelete(null);
    },
    onError: () => toast.error("Failed to delete lead", { id: "delete-lead" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => Promise.all(ids.map((id) => deleteLead(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedDeals([]);
      setShowDeleteConfirm(false);
      toast.success("Selected leads deleted", { id: "bulk-delete" });
    },
    onError: () => toast.error("Failed to delete leads", { id: "bulk-delete" }),
  });

  const handleMenuToggle = () => setIsSidebarOpen((v) => !v);
  const handleSidebarClose = () => setIsSidebarOpen(false);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };
  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setMode("view");
    setIsDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedDeal(null);
    setMode("view");
  };

  const handleUpdateLead = async (id, payload) => {
    const record =
      selectedDeal?.id === id ? selectedDeal : leads.find((l) => l.id === id);
    if (record && !canEditRecord("Lead", getPermissionRecord(record))) {
      toast.error("You do not have permission to edit this lead");
      return;
    }
    await updateLead(id, payload);
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  };

  const handleQuickUpdate = async (id, { fields = {} } = {}) => {
    const record = leads.find((l) => l.id === id);
    if (record && !canEditRecord("Lead", getPermissionRecord(record))) {
      toast.error("You do not have permission to edit this lead");
      throw new Error("permission-denied");
    }
    if (Object.keys(fields).length) {
      await updateLead(id, fields);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key && prev?.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const handleSelectDeal = (id, isSelected) => {
    setSelectedDeals((prev) =>
      isSelected ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  };
  const handleSelectAll = (isSelected) => {
    const ids = leads.map((d) => d.id);
    setSelectedDeals((prev) =>
      isSelected
        ? [...new Set([...prev, ...ids])]
        : prev.filter((x) => !ids.includes(x)),
    );
  };

  const handleRequestDelete = (deal) => {
    if (deal && !canDeleteRecord("Lead", getPermissionRecord(deal))) {
      toast.error("You do not have permission to delete this lead");
      return;
    }
    setLeadToDelete(deal);
  };
  const handleConfirmDelete = () => {
    if (leadToDelete?.id) {
      toast.loading("Deleting…", { id: "delete-lead" });
      deleteLeadMutation.mutate(leadToDelete.id);
    }
  };

  // Bulk actions (shown by the filter bar once leads are selected): mass-update
  // (re-assign / bulk status), export, or delete — same as the Leads page.
  const handleBulkAction = (action) => {
    if (action === "mass-update") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }
      const editableIds = selectedLeadRecords
        .filter((deal) => canEditRecord("Lead", getPermissionRecord(deal)))
        .map((deal) => deal.id);
      if (!editableIds.length || editableIds.length !== selectedDeals.length) {
        toast.error("Select only leads you have permission to edit");
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
      // Matches the Leads page — same helper, so the two cannot drift.
      if (!canExportLeads()) {
        toast.error("Export isn't available for your account");
        return;
      }
      runExport(
        selectedLeadRecords.map((lead) => lead?.id).filter(Boolean),
        "selected_inactive_leads",
        "csv",
      );
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
      if (!deletableIds.length || deletableIds.length !== selectedDeals.length) {
        toast.error("Select only leads you have permission to delete");
        return;
      }
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmBulkDelete = () => {
    if (!selectedDeals.length) return;
    const deletableIds = selectedLeadRecords
      .filter((deal) => canDeleteRecord("Lead", getPermissionRecord(deal)))
      .map((deal) => deal.id);
    if (!deletableIds.length || deletableIds.length !== selectedDeals.length) {
      toast.error("Select only leads you have permission to delete");
      return;
    }
    toast.loading("Deleting leads…", { id: "bulk-delete" });
    bulkDeleteMutation.mutate(deletableIds);
  };

  const handleBulkUpdateLeads = async (payload) => {
    const editableIds = selectedLeadRecords
      .filter((deal) => canEditRecord("Lead", getPermissionRecord(deal)))
      .map((deal) => deal.id);
    if (!editableIds.length || editableIds.length !== selectedDeals.length) {
      toast.error("Select only leads you have permission to edit");
      return;
    }
    await Promise.all(editableIds.map((id) => updateLead(id, payload)));
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setSelectedDeals([]);
    toast.success(`${editableIds.length} leads updated`);
  };

  const noop = () => {};

  return (
    <>
      <div className="min-h-screen bg-background">
        
        
        <main className="lg:ml-64 pt-16">
          <div className="p-4 sm:p-6">
            <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Inactive Leads
                </h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  Leads marked Broker, Dead, Low Budget, Duplicate, Invalid Number,
                  Irrelevant or Not Interested — review or re-assign them.
                </p>
              </div>

              {/* Export — mirrors the Leads page: opens the range picker
                  (First 100 / 250 / 500 from the current filter and sort),
                  visible to elevated users (admin / Owner / Manager) and
                  never to a restricted account. The filter it exports from
                  always carries INACTIVE_STATUSES, so this cannot reach an
                  active lead. */}
              {canExportLeads() && (
                <Button
                  className="linearbg-1 text-white hover:text-white shrink-0"
                  variant="outline"
                  onClick={() =>
                    setExportState({
                      open: true,
                      phase: "idle",
                      stage: "pick",
                      count: 0,
                      progress: { fetched: 0, target: 0 },
                    })
                  }
                >
                  <Icon name="Download" size={16} className="mr-2" />
                  Export
                </Button>
              )}
            </div>

            <DealsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={total}
              onBulkAction={handleBulkAction}
              onClearSelection={() => setSelectedDeals([])}
              selectedCount={selectedDeals?.length}
              statusOptions={INACTIVE_STATUS_OPTIONS}
              total={total}
              limit={limit}
              page={page}
            />

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
                  onDelete={handleRequestDelete}
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

            <DealDrawer
              status={status}
              industry={industry}
              source={source}
              leadsDetails={leadsDetails}
              deal={selectedDeal}
              mode={mode}
              isOpen={isDrawerOpen}
              onCreate={noop}
              onUpdate={handleUpdateLead}
              onClose={handleDrawerClose}
              onDelete={noop}
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
                  : "Export inactive leads"
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

            <ConfirmDeleteModal
              open={!!leadToDelete}
              title="Delete Lead"
              description="This lead and its activity history will be permanently removed."
              recordName={leadToDelete?.name}
              loading={deleteLeadMutation.isPending}
              onCancel={() => setLeadToDelete(null)}
              onConfirm={handleConfirmDelete}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default InactiveLeadsPage;
