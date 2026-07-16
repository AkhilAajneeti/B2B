import React, { useState, useMemo, useEffect } from "react";
import { canCreate, canDeleteRecord, canEntityRecord, canRead, getStoredAcl, getStoredUser, isAdminOrManager, isOwnRecord, isSupAdmin } from "../../utils/permission.js";
import { Helmet } from "react-helmet";
import toast from "react-hot-toast";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import DealsTable from "./components/DealsTable";
import DealsFilters from "./components/DealsFilters";
import DealDrawer from "./components/DealDrawer";
import ProjectCard from "./components/ProjectCard";
import ProjectKpis from "./components/ProjectKpis";
import Papa from "papaparse";
import TablePagination from "./components/TablePagination";
import { useProject, useProjects } from "hooks/useProjects";
import {
  bulkDeleteProject,
  createProject,
  deleteProject,
  updateProject,
} from "services/projects.service";
import { useQueryClient } from "@tanstack/react-query";

const ProjectsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [mode, setMode] = useState("view");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [filters, setFilters] = useState({
    search: "",
    assignUser: "",
    dateType: "",
    closeDateFrom: "",
    closeDateTo: "",
  });
  const queryClient = useQueryClient();
  const { data, isLoading } = useProjects({
    page: currentPage,
    limit: itemsPerPage,
    filters,
    orderBy: sortConfig?.key || "createdAt",
    order: sortConfig?.direction || "desc"
  });
  const loading = isLoading;
  const { data: selectedDealData } = useProject(
    selectedDeal?.id,
    isDrawerOpen && !!selectedDeal?.id,
  );

  const handleDealClick = async (deal) => {
    setSelectedDeal(deal); // only store basic info (id)
    setMode("view");
    setIsDrawerOpen(true);
  };

  const currentUser = getStoredUser();

  const projects = data?.list || [];
  const totalItems = data?.total || 0;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const exportLeadsToCSV = (rows, fileName = "projects_export") => {
    if (!rows || rows.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = rows.map((project) => ({
      Name: project?.name || "",
      Status: project?.status || "",
      Priority: project?.priority || "",
      "Assigned User": project?.assignedUserName || "",
      "Created At": project?.createdAt || "",
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
      await createProject(payload); // API
      queryClient.invalidateQueries(["projects"]);
      toast.success("Project created successfully");
    } catch (err) {
      console.error("Project creationd failed", err);
      toast.error("Project is not created!");
    }
  };

  const handleUpdateTasks = async (id, payload) => {
    try {
      await updateProject(id, payload);
      queryClient.invalidateQueries(["projects"]);
      toast.success("Project Update successfully");
    } catch (err) {
      console.error("Project updation failed", err);
      toast.error("Project is not Update!");
    }
  };
  const handleBulkUpdateTasks = async (ids, payload) => {
    try {
      toast.loading("Updating projects...", { id: "bulk-update" });

      await Promise.all(ids.map((id) => updateProject(id, payload)));
      // 🔥 MISSING LINE (IMPORTANT)
      queryClient.invalidateQueries(["projects"]);
      toast.success(`${ids.length} Projects updated`, { id: "bulk-update" });
      setSelectedDeals([]);
    } catch (err) {
      console.error(err);
      toast.error("Mass update failed", { id: "bulk-update" });
    }
  };

  //deletion delete
  const handleDeleteLead = async (id) => {
    // Record-level guard — see meeting/index.jsx for full rationale.
    const record = projects.find((p) => p.id === id);
    if (record && !canDeleteRecord("Project", record)) {
      toast.error("You do not have permission to delete this project");
      return;
    }
    try {
      toast.loading("Deleting Project...", { id: "delete-project" });
      await deleteProject(id); // API call
      queryClient.invalidateQueries(["projects"]);
      toast.success("Project deleted successfully", {
        id: "delete-project",
      });
    } catch (err) {
      console.error("Delete failed", err);
    }
  };
  const handleBulkDelete = async () => {
    if (!selectedDeals.length) {
      toast.error("Please select at least one projects");
      return;
    }

    const ok = window.confirm(
      `Delete ${selectedDeals.length} selected projects?`,
    );
    if (!ok) return;

    try {
      toast.loading("Deleting projects...", { id: "bulk-delete" });
      await bulkDeleteProject(selectedDeals);

      queryClient.invalidateQueries(["projects"]);

      setSelectedDeals([]);
      toast.success("Project deleted successfully", {
        id: "bulk-delete",
      });
    } catch (err) {
      console.error("Bulk delete failed", err);
      toast.error("Failed to delete Project", {
        id: "bulk-delete",
      });
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
      const currentPageDeals = projects.map((deal) => deal.id);
      setSelectedDeals([...new Set([...selectedDeals, ...currentPageDeals])]);
    } else {
      const currentPageDeals = projects
        ?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        ?.map((deal) => deal?.id);
      setSelectedDeals(
        selectedDeals?.filter((id) => !currentPageDeals?.includes(id)),
      );
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      assignUser: "",
      dateType: "",
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

      const selectedRows = projects.filter((deal) =>
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
        <title>My Campaigns - Aajneeti Connect ltd</title>
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
                  My Campaigns
                </h1>
                <p className="text-muted-foreground mt-1">
                  Easily create, assign, and track tasks to ensure every
                  campaigns is completed on time and nothing is missed in your
                  workflow.
                </p>
              </div>
              <div className="flex items-center space-x-3">
               
               
                <Button onClick={handleAddLeads} className="linearbg-1 text-white hover:text-white">
                  <Icon name="Plus" size={16} className="mr-2" />
                  New Campaigns
                </Button>

              </div>
            </div>

            {/* KPI row */}
            <ProjectKpis totalProjects={totalItems} />

            {/* Filters + view toggle */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <DealsFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onClearFilters={handleClearFilters}
                  dealCount={totalItems}
                  onBulkAction={handleBulkAction}
                  selectedCount={selectedDeals?.length}
                />
              </div>
              <div className="inline-flex shrink-0 rounded-lg border border-border bg-card p-0.5">
                {["cards", "table"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                      viewMode === v
                        ? "bg-[#6E1420] text-white"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* List — cards (default) or table */}
            {viewMode === "cards" ? (
              loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                  <Icon name="Loader" size={22} className="mr-2 animate-spin" />
                  Loading campaigns…
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Icon name="Layers" size={28} className="mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No campaigns found</p>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-[26px] sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={i}
                      onOpen={handleDealClick}
                    />
                  ))}
                </div>
              )
            ) : (
              /* Table + pagination — one rounded card: table is the body,
                 pagination is the footer, sharing border/shadow/corners.
                 Matches the deals & reports tables. */
              <div className="overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.08)] shadow-[0_1px_2px_rgba(16,24,40,.04),0_4px_16px_rgba(16,24,40,.06)]">
                <DealsTable
                  deals={projects}
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

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              </div>
            )}

            {/* Pagination — card view only; the table view renders its own
                inside the card above. */}
            {viewMode === "cards" && (
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
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
          selectedIds={selectedDeals}
          onBulkUpdate={handleBulkUpdateTasks} // 👈 NEW
        />
      </div>
    </>
  );
};

export default ProjectsPage;
