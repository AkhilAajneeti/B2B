import React, { useState, useMemo, useEffect } from "react";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import DealsTable from "./components/DealsTable";
import DealsFilters from "./components/DealsFilters";
import DealDrawer from "./components/DealDrawer";
import Papa from "papaparse";
import TablePagination from "./components/TablePagination";
import {
  createTasks,
  deleteTasks,
  updateTasks,
  bulkDeleteTasks,
  deleteActivity,
} from "services/tasks.service";
import { useQueryClient } from "@tanstack/react-query";
import { useTasks } from "hooks/useTasks";
import { useTask } from "hooks/useTask";
const TaskPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [mode, setMode] = useState("view");
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    priority: "",
    assignUser: "",
    closeDateFrom: "",
    closeDateTo: "",
  });
  const queryClient = useQueryClient();
  const { data, isLoading } = useTasks();

  const leads = data?.list || [];
  const loading = isLoading;

  // Mock deals data
  const handleDealClick = async (deal) => {
    setSelectedDeal(deal);
    setMode("view");
    setIsDrawerOpen(true);
  };
  const { data: selectedDealData } = useTask(
  selectedDeal?.id,
  isDrawerOpen && !!selectedDeal?.id
);

  // Filter and sort deals
  const filteredAndSortedDeals = useMemo(() => {
    let filtered = leads?.filter((deal) => {
      const search = filters?.search?.toLowerCase();

      const matchesSearch =
        !search ||
        deal?.name?.toLowerCase()?.includes(search) ||
        deal?.emailAddress?.toLowerCase()?.includes(search) ||
        deal?.phoneNumber?.includes(search) ||
        deal?.accountName?.toLowerCase()?.includes(search);

      const matchesStatus =
        !filters?.status || deal?.status === filters?.status;

      const matchesPriority =
        !filters?.priority || deal?.priority === filters?.priority;

      const matchesAssignUser =
        !filters.assignUser ||
        String(deal.assignedUserId) === String(filters.assignUser);

      const matchesCreatedFrom =
        !filters?.closeDateFrom ||
        new Date(deal?.createdAt) >= new Date(filters?.closeDateFrom);

      const matchesCreatedTo =
        !filters?.closeDateTo ||
        new Date(deal?.createdAt) <= new Date(filters?.closeDateTo);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignUser &&
        matchesCreatedFrom &&
        matchesCreatedTo
      );
    });

    // ✅ SAFE SORTING
    if (sortConfig?.key) {
      filtered.sort((a, b) => {
        let aValue = a?.[sortConfig.key];
        let bValue = b?.[sortConfig.key];

        if (sortConfig.key === "opportunityAmount") {
          aValue = Number(aValue ?? 0);
          bValue = Number(bValue ?? 0);
        } else if (sortConfig.key === "createdAt") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [leads, filters, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedDeals?.length / itemsPerPage);

  const exportLeadsToCSV = (rows, fileName = "leads_export") => {
    if (!rows || rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = rows.map((lead) => ({
      Name: lead?.name || "",
      Email: lead?.emailAddress || "",
      Phone: lead?.phoneNumber || "",
      Status: lead?.status || "",
      Source: lead?.source || "",
      "Project Name": lead?.cProjectName || "",
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

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setSelectedDeal(null);
    setMode("view");
  };

  const handleCreateLead = async (payload) => {
    try {
      await createTasks(payload); // API
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task created successfully");
    } catch (err) {
      console.error("Task creationd failed", err);
    }
  };

  const handleUpdateTasks = async (id, payload) => {
    await updateTasks(id, payload);
    queryClient.invalidateQueries(["tasks"]);
  };
  const handleBulkUpdateTasks = async (ids, payload) => {
    try {
      toast.loading("Updating tasks...", { id: "bulk-update" });

      await Promise.all(ids.map((id) => updateTasks(id, payload)));
      queryClient.invalidateQueries(["tasks"]);
      toast.success(`${ids.length} tasks updated`, { id: "bulk-update" });
      setSelectedDeals([]);
    } catch (err) {
      console.error(err);
      toast.error("Mass update failed", { id: "bulk-update" });
    }
  };

  //deletion delete
  const handleDeleteLead = async (id) => {
    try {
      toast.loading("Deleting task...", { id: "delete-task" });
      await deleteTasks(id); // API call
      queryClient.invalidateQueries(["tasks"]);
      toast.success("Task deleted successfully", {
        id: "delete-task",
      });
    } catch (err) {
      console.error("Delete failed", err);
    }
  };
  const handleBulkDelete = async () => {
    if (!selectedDeals.length) {
      toast.error("Please select at least one task");
      return;
    }

    const ok = window.confirm(`Delete ${selectedDeals.length} selected tasks?`);
    if (!ok) return;

    try {
      toast.loading("Deleting tasks...", { id: "bulk-delete" });

      await bulkDeleteTasks(selectedDeals);
      // ✅ Remove from UI
      queryClient.invalidateQueries(["tasks"]);

      // ✅ Clear selection
      setSelectedDeals([]);

      toast.success("Tasks deleted successfully", {
        id: "bulk-delete",
      });
    } catch (err) {
      console.error("Bulk delete failed", err);
      toast.error("Failed to delete tasks", {
        id: "bulk-delete",
      });
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
    if (isSelected) {
      const currentPageDeals = filteredAndSortedDeals
        ?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        ?.map((deal) => deal?.id);
      setSelectedDeals([...new Set([...selectedDeals, ...currentPageDeals])]);
    } else {
      const currentPageDeals = filteredAndSortedDeals
        ?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        ?.map((deal) => deal?.id);
      setSelectedDeals(
        selectedDeals?.filter((id) => !currentPageDeals?.includes(id)),
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
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "",
      priority: "",
      assignUser: "",
      closeDateFrom: "",
      closeDateTo: "",
    });
    setCurrentPage(1);
  };

  const handleBulkAction = (action) => {
    if (!selectedDeals.length) {
      toast.error("Please select at least one task");
      return;
    }
    if (action === "export") {
      if (!selectedDeals.length) {
        toast.error("Select at least one lead");
        return;
      }

      const selectedRows = filteredAndSortedDeals.filter((deal) =>
        selectedDeals.includes(deal.id),
      );

      exportLeadsToCSV(selectedRows, "selected_leads");
      return;
    }

    if (action === "delete") {
      handleBulkDelete();
    }

    if (action === "massupdate") {
      setMode("mass-update");
      setIsDrawerOpen(true);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  return (
    <>
      <Helmet>
        <title>Leads - Aajneeti Connect ltd</title>
        <meta
          name="description"
          content="Manage and track your sales deals with comprehensive filtering and pipeline management tools."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header onMenuToggle={handleMenuToggle} isSidebarOpen={isSidebarOpen} />
        <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

        <main className="lg:ml-64 pt-16">
          <div className="p-4 lg:p-6">
            {/* Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Tasks
                </h1>
                <p className="text-muted-foreground mt-1">
                  Easily create, assign, and track tasks to ensure every
                  activity is completed on time and nothing is missed in your
                  workflow
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    exportLeadsToCSV(filteredAndSortedDeals, "all_leads")
                  }
                >
                  <Icon name="Download" size={16} className="mr-2" />
                  Export All
                </Button>
                <Button onClick={handleAddLeads} className="linearbg-1 text-white hover:text-white">
                  <Icon name="Plus" size={16} className="mr-2" />
                  New Tasks
                </Button>
              </div>
            </div>

            {/* Filters */}
            <DealsFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              dealCount={filteredAndSortedDeals?.length}
              onBulkAction={handleBulkAction}
              selectedCount={selectedDeals?.length}
            />

            {/* Deals Table */}
            <DealsTable
              deals={filteredAndSortedDeals}
              selectedDeals={selectedDeals}
              onSelectDeal={handleSelectDeal}
              onSelectAll={handleSelectAll}
              onDealClick={handleDealClick}
              sortConfig={sortConfig}
              onSort={handleSort}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onDelete={handleDeleteLead}
              isLoading={loading}
            />

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedDeals?.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        </main>

        {/* Deal Drawer */}
        <DealDrawer
          deal={selectedDealData}
          mode={mode}
          isOpen={isDrawerOpen}
          onCreate={handleCreateLead}
          onUpdate={handleUpdateTasks}
          onClose={handleDrawerClose}
          onDelete={handleDeleteActivity}
          selectedIds={selectedDeals}
          onBulkUpdate={handleBulkUpdateTasks} // 👈 NEW
        />
      </div>
    </>
  );
};

export default TaskPage;
