import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import { Droppable, DragDropContext } from "@hello-pangea/dnd";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import PipelineColumn from "./components/PipelineColumn";
import PipelineFilters from "./components/PipelineFilters";
import PipelineStats from "./components/PipelineStats";
import PipelineSummaryAlert from "./components/PipelineSummaryAlert";
import AddDealModal from "./components/AddDealModal";
import VersionHistoryModal from "./components/VersionHistoryModal";
import { usePipelineData } from "./hooks/usePipelineData";
import { usePipelineFilters } from "./hooks/usePipelineFilters";
import { usePipelineStats } from "./hooks/usePipelineStats";
import { usePipelineActions } from "./hooks/usePipelineActions";
import { PIPELINE_COLUMNS } from "./utils/pipelineConstants";
import LeadFunnel from "./components/LeadFunnel";

/**
 * Pipeline - smart, action-based sales pipeline.
 *
 * Pure orchestrator: every calculation, grouping, filtering and mutation lives
 * in the hooks / services / utils layers. This component only wires the hooks
 * to the presentation components.
 */
const Pipeline = () => {
  // --- local UI state (modals / sidebar only) ------------------------------
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedDealForHistory, setSelectedDealForHistory] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  // KPI card → single-column filter. null = show every column.
  const [activeKpi, setActiveKpi] = useState(null);
  const toggleKpi = useCallback(
    (category) => setActiveKpi((cur) => (cur === category ? null : category)),
    [],
  );

  // --- data + derived state (all logic lives in hooks) ---------------------
  const { deals, isLoading, isError, isFetching, refetch } = usePipelineData();
  const {
    filters,
    setFilter,
    resetFilters,
    filteredDeals,
    groupedDeals,
    activeFilterCount,
  } = usePipelineFilters(deals);
  const stats = usePipelineStats(filteredDeals);
  const { moveDeal, deleteDeal } = usePipelineActions();

  // When a KPI is active, show only its matching column.
  const visibleColumns = activeKpi
    ? PIPELINE_COLUMNS.filter((c) => c.id === activeKpi)
    : PIPELINE_COLUMNS;
  const activeColumnName = PIPELINE_COLUMNS.find((c) => c.id === activeKpi)?.name;

  // --- handlers ------------------------------------------------------------
  const handleSidebarToggle = useCallback(
    () => setIsSidebarOpen((open) => !open),
    [],
  );
  const handleSidebarClose = useCallback(() => setIsSidebarOpen(false), []);

  const handleDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId) return;
      // Reschedules the follow-up (or rejects derived columns) - see the hook.
      moveDeal(draggableId, destination.droppableId);
    },
    [moveDeal],
  );

  const handleDeleteDeal = useCallback(
    (dealId) => {
      if (window.confirm("Remove this lead from the pipeline?")) {
        deleteDeal(dealId);
      }
    },
    [deleteDeal],
  );

  const handleViewHistory = useCallback((dealId) => {
    setSelectedDealForHistory(dealId);
    setIsVersionModalOpen(true);
  }, []);

  const handleAddDeal = useCallback((stageId = null) => {
    setSelectedStage(stageId);
    setIsAddDealModalOpen(true);
  }, []);

  const handleSaveDeal = useCallback(() => {
    setIsAddDealModalOpen(false);
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pipeline - Aajneeti Connect ltd</title>
        <meta
          name="description"
          content="Action-based sales pipeline for follow-up tracking, urgency management and daily sales operations."
        />
      </Helmet>

      <Header onMenuToggle={handleSidebarToggle} isSidebarOpen={isSidebarOpen} />
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />

      <main className="lg:ml-64 pt-16">
        <div className="p-6 space-y-6">
          {/* Page header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              {/* Eyebrow */}
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#AC2334] text-white">
                  <Icon name="BarChart3" size={15} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#AC2334]">
                  Sales Pipeline
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Your leads today
              </h1>
              <p className="mt-1.5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {stats.dueToday} follow-up{stats.dueToday === 1 ? "" : "s"}
                </span>{" "}
                {stats.dueToday === 1 ? "is" : "are"} due today and{" "}
                <span className="font-semibold text-foreground">
                  {stats.overdue} {stats.overdue === 1 ? "is" : "are"} overdue
                </span>
                {stats.overdue === 0 ? (
                  <span className="font-medium text-emerald-600">
                    {" "}— you're on top of it.
                  </span>
                ) : (
                  <span className="font-medium text-[#AC2334]">
                    {" "}— clear the overdue first.
                  </span>
                )}
                <br />
                Work the list below, top priority first.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                iconName="RefreshCw"
                iconPosition="left"
                iconSize={16}
              >
                Refresh
              </Button>

            </div>
          </div>

          {/* Lead-stage funnel */}
          <LeadFunnel />

          {/* Login summary banner */}
          <PipelineSummaryAlert stats={stats} />
           {/* Filters */}
          <PipelineFilters
            filters={filters}
            deals={deals}
            onFilterChange={setFilter}
            onReset={resetFilters}
            activeFilterCount={activeFilterCount}
          />

          {/* Summary cards */}
          <PipelineStats
            stats={stats}
            activeCategory={activeKpi}
            onSelect={toggleKpi}
          />

         

          {/* Pipeline board */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center gap-3 mb-6">
              <Icon name="Kanban" size={24} className="text-primary" />
              <h2 className="text-xl font-bold text-card-foreground">
                Pipeline Board
              </h2>
              {isFetching && !isLoading && (
                <span className="text-xs text-muted-foreground">
                  Syncing...
                </span>
              )}
            </div>

            {/* Active KPI filter indicator */}
            <AnimatePresence>
              {activeKpi && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 flex flex-wrap items-center gap-2"
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    Showing: {activeColumnName}
                    <button
                      onClick={() => setActiveKpi(null)}
                      aria-label="Clear filter"
                      className="grid h-5 w-5 place-items-center rounded-full transition-colors hover:bg-primary/20"
                    >
                      <Icon name="X" size={13} />
                    </button>
                  </span>
                  <button
                    onClick={() => setActiveKpi(null)}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear Filter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Icon
                  name="Loader"
                  size={32}
                  className="text-primary animate-spin mb-3"
                />
                <p className="text-muted-foreground">Loading pipeline...</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <Icon name="AlertTriangle" size={26} className="text-red-600" />
                </div>
                <p className="text-foreground font-medium mb-1">
                  Couldn't load the pipeline
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Something went wrong while fetching your leads.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Try again
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto">
                  <div
                    className={`flex min-h-[600px] ${
                      activeKpi ? "" : "gap-6 w-max min-w-full"
                    }`}
                  >
                    <AnimatePresence initial={false}>
                      {visibleColumns.map((column, index) => (
                        <motion.div
                          key={column.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, delay: index * 0.05 }}
                          className={`h-full flex-shrink-0 ${
                            activeKpi ? "w-full max-w-3xl" : "w-80"
                          }`}
                        >
                        <Droppable droppableId={column.id}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`h-full rounded-xl transition-colors ${snapshot.isDraggingOver
                                  ? "ring-2 ring-primary/40"
                                  : ""
                                }`}
                            >
                              <PipelineColumn
                                column={column}
                                deals={groupedDeals[column.id] || []}
                                onDeleteDeal={handleDeleteDeal}
                                onViewHistory={handleViewHistory}
                              />
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </DragDropContext>
            )}
          </div>
        </div>
      </main>

      {/* Modals (reused as-is) */}
      <AddDealModal
        isOpen={isAddDealModalOpen}
        onClose={() => setIsAddDealModalOpen(false)}
        onSave={handleSaveDeal}
        initialStage={selectedStage}
      />
      <VersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        dealId={selectedDealForHistory}
      />
    </div>
  );
};

export default Pipeline;
