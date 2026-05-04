import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Header from "../../components/ui/Header";
import Sidebar from "../../components/ui/Sidebar";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import PipelineColumn from "./components/PipelineColumn";
import PipelineFilters from "./components/PipelineFilters";
import AddDealModal from "./components/AddDealModal";
import PipelineStats from "./components/PipelineStats";
import { deleteActivity, deleteLead, fetchLeads } from "services/leads.service";
import VersionHistoryModal from "./components/VersionHistoryModal";
import toast from "react-hot-toast";
import { Droppable, Draggable, DragDropContext } from "@hello-pangea/dnd";
import { Helmet } from "react-helmet";

const Pipeline = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [selectedDealForHistory, setSelectedDealForHistory] = useState(null);
  const [selectedStage, setSelectedStage] = useState(null);
  const [deals, setDeals] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    owner: "all",
    priority: "all",
    dateRange: "all",
    minValue: 0,
    maxValue: 0,
    startDate: "",
    endDate: "",
  });
  useEffect(() => {
    const loadLeads = async () => {
      try {
        const data = await fetchLeads();
        const normalizedDeals = (data.list || []).map((item) => ({
          id: item.id,
          title: item.name,
          stage: classifyDeal(item) || "active_daily",
          status: item.status,
          source: item.source,
          value: item.opportunityAmount || 0,
          cProject: item.cProject,
          owner: {
            id: item.assignedUserId,
            name: item.assignedUserName,
          },
          createdAt: item.createdAt,
          cNextContact: item.cNextContactAt,
        }));

        setDeals(normalizedDeals);

        console.log(data.list);
      } catch (error) {
        console.log("failed to fetch data", error);
      }
    };
    loadLeads();
  }, []);

  // PipeLine Deals
  // return if deal is won or lose or inactive
  const pipeLineDeals = useMemo(() => {
    return deals.filter((deal) => {
      // remove closed/lost
      if (["won", "lost"].includes(deal?.stage)) return false;

      // if you add soft delete later
      if (deal?.isActive === false) return false;

      return true;
    });
  }, [deals]);
  // Mock data for pipeline stages
  const pipelineSections = [
    { id: "active_daily", name: "Active - Daily", color: "red" },
    { id: "active_two_week", name: "Active - Two Week", color: "yellow" },
    { id: "active_monthly", name: "Active - Monthly", color: "green" },
    { id: "scheduled", name: "Scheduled", color: "blue" },
    { id: "budget_issue", name: "Budget Issue", color: "orange" },
    { id: "stale", name: "Stale (30+ Days)", color: "gray" },
  ];

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleAddDeal = (stageId = null) => {
    setSelectedStage(stageId);
    setIsAddDealModalOpen(true);
  };
  const handleVersionModal = () => {
    setIsVersionModalOpen(true);
    setSelectedDealForHistory(null); // board level history
  };

  const handleSaveDeal = (newDeal) => {
    setDeals((prevDeals) => [...prevDeals, newDeal]);
  };

  const handleDragEnd = (result) => {
    const { source, destination } = result;

    if (!destination) return;

    setDeals((prevDeals) => {
      const updated = Array.from(prevDeals);

      // find items in source column
      const sourceItems = updated.filter((d) => d.stage === source.droppableId);

      const movedItem = sourceItems[source.index];

      if (!movedItem) return prevDeals;

      // remove from old position
      const newDeals = updated.filter((d) => d.id !== movedItem.id);

      // insert into new position
      const destinationItems = newDeals.filter(
        (d) => d.stage === destination.droppableId,
      );

      destinationItems.splice(destination.index, 0, {
        ...movedItem,
        stage: destination.droppableId,
      });

      // merge back
      const others = newDeals.filter(
        (d) => d.stage !== destination.droppableId,
      );

      return [...others, ...destinationItems];
    });
  };

  const handleEditDeal = (deal) => {
    console.log("Edit deal:", deal);
    // Implement edit functionality
  };

  const handleDeleteDeal = (dealId) => {
    if (window.confirm("Are you sure you want to delete this deal?")) {
      const deleteLeads = async () => {
        try {
          await deleteLead(dealId);
          toast.success("Deal deleted successfully ✅");
        } catch (err) {
          toast.error("Failed to delete deal ❌");
        }
      };

      deleteLeads();
    }
  };

  const handleCloneDeal = (deal) => {
    const clonedDeal = {
      ...deal,
      id: `deal-${Date.now()}`,
      title: `${deal?.title} (Copy)`,
      createdAt: new Date()?.toISOString(),
      updatedAt: new Date()?.toISOString(),
    };
    setDeals((prevDeals) => [...prevDeals, clonedDeal]);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      owner: "all",
      priority: "all",
      dateRange: "all",
      minValue: 0,
      maxValue: 0,
      startDate: "",
      endDate: "",
    });
  };
  const handleOpenVersionHistory = (dealId) => {
    setSelectedDealForHistory(dealId);
    setIsVersionModalOpen(true);
  };

  // const filteredDeals = getFilteredDeals();
  const filteredDeals = useMemo(() => {
    return pipeLineDeals.filter((deal) => {
      // Search filter
      if (
        filters?.search &&
        !deal?.title?.toLowerCase()?.includes(filters?.search?.toLowerCase()) &&
        !deal?.accountName
          ?.toLowerCase()
          ?.includes(filters?.search?.toLowerCase())
      ) {
        return false;
      }

      // Owner filter
      if (
        filters?.owner &&
        filters?.owner !== "all" &&
        deal?.owner?.id !== filters?.owner
      ) {
        return false;
      }

      // Priority filter
      if (
        filters?.priority &&
        filters?.priority !== "all" &&
        deal?.priority !== filters?.priority
      ) {
        return false;
      }

      // Value range
      if (filters?.minValue && deal?.value < filters?.minValue) return false;
      if (filters?.maxValue && deal?.value > filters?.maxValue) return false;

      return true;
    });
  }, [pipeLineDeals, filters]);

  const getDealsBySection = (sectionId) => {
    return filteredDeals?.filter((deal) => deal.stage === sectionId);
  };

  const classifyDeal = (deal) => {
    const now = new Date();
    const createdAt = deal?.createdAt
      ? new Date(deal.createdAt.replace(" ", "T"))
      : null;
    const nextContact = deal?.cNextContact
      ? new Date(deal.cNextContact.replace(" ", "T"))
      : null;

    const diffCreatedDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    // 1️⃣ Budget Issue (based on status)
    if (deal?.status === "Low Budget") {
      return "budget_issue";
    }

    // 2️⃣ Active (upcoming next contact within 30 days)
    if (nextContact) {
      const diffDays = (nextContact - now) / (1000 * 60 * 60 * 24);

      if (diffDays >= 0 && diffDays <= 1) return "active_daily";
      if (diffDays > 1 && diffDays <= 14) return "active_two_week";
      if (diffDays > 14 && diffDays <= 30) return "active_monthly";
    }

    // 3️⃣ Scheduled (future but > 30 days)
    if (nextContact) {
      const diffDays = (nextContact - now) / (1000 * 60 * 60 * 24);

      if (diffDays > 30) return "scheduled";
    }

    // 4️⃣ Stale (older than 30 days & no active movement)
    if (diffCreatedDays > 30) {
      return "stale";
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pipeline - Aajneeti Connect ltd</title>
        <meta
          name="description"
          content="Manage and track your sales deals with comprehensive filtering and pipeline management tools."
        />
      </Helmet>

      <Header
        onMenuToggle={handleSidebarToggle}
        isSidebarOpen={isSidebarOpen}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
      <main className="lg:ml-64 pt-16">
        <div className="p-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Sales Pipeline
              </h1>
              <p className="text-muted-foreground">
                Manage your deals through the sales process with drag-and-drop
                functionality
              </p>
            </div>
          </div>

          {/* Pipeline Stats */}
          <PipelineStats deals={filteredDeals} />

          {/* Pipeline Board */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Icon name="Kanban" size={24} className="text-primary" />
                <div>
                  <h2 className="text-xl font-bold text-card-foreground">
                    Pipeline Board
                  </h2>
                </div>
              </div>
            </div>

            {/* Kanban Board with Horizontal Scroll */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="overflow-x-auto">
                <div className="flex gap-6 min-h-[600px] w-max min-w-full">
                  {pipelineSections?.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0 w-80 h-full"
                    >
                      <Droppable droppableId={stage.id}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="h-full"
                          >
                            <PipelineColumn
                              stage={stage}
                              deals={getDealsBySection(stage.id)}
                              onViewHistory={handleOpenVersionHistory}
                              onAddDeal={handleAddDeal}
                              onEditDeal={handleEditDeal}
                              onDeleteDeal={handleDeleteDeal}
                              onCloneDeal={handleCloneDeal}
                            />
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </motion.div>
                  ))}
                </div>
              </div>
            </DragDropContext>

            {/* Mobile Pipeline View */}
            <div className="hidden">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Icon name="Smartphone" size={24} className="text-primary" />
                  <div>
                    <h3 className="text-lg font-bold text-card-foreground">
                      Mobile Pipeline View
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Switch to landscape mode or use a larger screen for the
                      full Kanban board experience.
                    </p>
                  </div>
                </div>

                {/* Stage Tabs for Mobile */}
                <div className="space-y-4">
                  {pipelineSections?.map((section) => {
                    const stageDeals = getDealsBySection(section?.id);
                    return (
                      <div
                        key={section?.id}
                        className="border border-border rounded-lg p-4 bg-muted/20"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-card-foreground text-base">
                            {section?.name}
                          </h4>
                          <span className="text-sm font-medium text-foreground bg-background px-2 py-1 rounded-full">
                            {stageDeals?.length} deal
                            {stageDeals?.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="text-base font-semibold text-primary">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                          })?.format(
                            stageDeals?.reduce(
                              (sum, deal) => sum + deal?.value,
                              0,
                            ),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Add Deal Modal */}
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
