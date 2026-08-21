import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import DealsTable from "../deals/components/DealsTable";
import DealDrawer from "../deals/components/DealDrawer";
import TablePagination from "../deals/components/TablePagination";
import ConfirmDeleteModal from "../deals/components/ConfirmDeleteModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteLead, updateLead } from "services/leads.service";
import { useNewLeads } from "hooks/useLeads";
import { useMetaData } from "hooks/useMetaData";
import { useLeadDetails } from "hooks/useLeadDetails";
import { useUsers } from "hooks/useUsers";
import { canEditRecord, canDeleteRecord } from "utils/permission";

/**
 * Inactive Leads — an independent page that surfaces ONLY the inactive / lost
 * leads so they can be reviewed or re-assigned. It reuses the Leads section's exact
 * fetch pattern (useNewLeads -> fetchNewLeads -> whereGroup `status IN [...]`)
 * and the same table + drawer UI, with the status filter LOCKED to the statuses
 * below. Nothing in the Leads section is modified — its components are only
 * imported.
 */
const INACTIVE_STATUSES = [
  "Broker",
  "Dead",
  "Low Budget",
  "Duplicate",
  "Invalid Number",
  "Irrelevant Lead",
  "Not Interested",
];

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

  // Locked status filter — this page only ever fetches the replace statuses.
  // Same filter shape the Leads page sends, so the backend where-clause is built
  // identically (status IN [...]).
  const filters = useMemo(
    () => ({
      search: "",
      status: INACTIVE_STATUSES,
      sector: "",
      cProject: "",
      source: "",
      assignUser: "",
      team: "",
      dateType: "",
      closeDateFrom: "",
      closeDateTo: "",
      xDays: "",
    }),
    [],
  );

  const { data: leadsData, isLoading } = useNewLeads({ limit, page, filters });
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

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      toast.success("Lead deleted", { id: "delete-lead" });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setLeadToDelete(null);
    },
    onError: () => toast.error("Failed to delete lead", { id: "delete-lead" }),
  });

  const handleMenuToggle = () => setIsSidebarOpen((v) => !v);
  const handleSidebarClose = () => setIsSidebarOpen(false);

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setMode("view");
    setIsDrawerOpen(true);
  };
  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedDeal(null);
  };

  const handleUpdateLead = async (id, payload) => {
    const record =
      selectedDeal?.id === id
        ? selectedDeal
        : leads.find((l) => l.id === id);
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
              <span className="inline-block mt-2 text-sm text-muted-foreground">
                {total} lead{total === 1 ? "" : "s"}
              </span>
            </div>

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
              onBulkUpdate={noop}
              selectedIds={selectedDeals}
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
