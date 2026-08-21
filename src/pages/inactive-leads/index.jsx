import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import Papa from "papaparse";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import DealsTable from "../deals/components/DealsTable";
import DealsFilters from "../deals/components/DealsFilters";
import DealDrawer from "../deals/components/DealDrawer";
import TablePagination from "../deals/components/TablePagination";
import ConfirmDeleteModal from "../deals/components/ConfirmDeleteModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLead, updateLead } from "services/leads.service";
import { useNewLeads } from "hooks/useLeads";
import { useMetaData } from "hooks/useMetaData";
import { useLeadDetails } from "hooks/useLeadDetails";
import { useUsers } from "hooks/useUsers";
import { useTeamUsers } from "hooks/useTeams";
import { canEditRecord, canDeleteRecord } from "utils/permission";

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
  sector: "",
  cProject: "",
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

  const { data: leadsData, isLoading } = useNewLeads({
    limit,
    page,
    filters: filtersForBackend,
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

  const exportLeadsToCSV = (rows, fileName = "inactive_leads") => {
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
      exportLeadsToCSV(selectedLeadRecords, "selected_inactive_leads");
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
      <Helmet>
        <title>Inactive Leads</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
        <main className="lg:ml-64 pt-16">
          <div className="p-4 sm:p-6">
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Inactive Leads
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                Leads marked Broker, Dead, Low Budget, Duplicate, Invalid Number,
                Irrelevant or Not Interested — review or re-assign them.
              </p>
            </div>

            <DealsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={total}
              onBulkAction={handleBulkAction}
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
