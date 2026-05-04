import React, { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import DealCard from "./DealCard";
import { Draggable } from "@hello-pangea/dnd";

const PipelineColumn = ({
  stage,
  deals,
  onDealMove,
  onEditDeal,
  onDeleteDeal,
  onCloneDeal,
  onViewHistory,
}) => {
  const [isOver, setIsOver] = useState(false);
  const getStageColor = (stageName) => {
    const colors = {
      New: "bg-blue-100 text-blue-800 border-blue-200",
      Qualified: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Proposal: "bg-purple-100 text-purple-800 border-purple-200",
      Won: "bg-green-100 text-green-800 border-green-200",
      Lost: "bg-red-100 text-red-800 border-red-200",
    };
    return colors?.[stageName] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    onDealMove(dealId, stage.id);
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-xl border border-border">
      {/* Column Header */}
      <div className="p-4 border-b border-border bg-background/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1.5 text-sm font-semibold rounded-full border ${getStageColor(stage?.name)}`}
            >
              {stage?.name}
            </span>
            <span className="text-sm font-medium text-foreground bg-muted px-2 py-1 rounded-full">
              {deals?.length} deal{deals?.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
      {/* Deals Container */}
      <div
        className={`flex-1 p-3 space-y-3 overflow-y-auto max-h-[100vh] transition-all
        ${isOver ? "bg-primary/10 border-2 border-primary border-dashed" : ""} `}
        // onDragOver={handleDragOver}
        // onDragLeave={handleDragLeave}
        // onDrop={handleDrop}
      >
        {deals?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Icon name="Target" size={28} className="text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground mb-2">
              No deals in {stage?.name}
            </p>
            
          </div>
        ) : (
          deals?.map((deal, index) => (
            <Draggable key={deal.id} draggableId={deal.id} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <DealCard
                    deal={deal}
                    onEdit={() => onEditDeal(deal)}
                    onDelete={() => onDeleteDeal(deal.id)}
                    onClone={() => onCloneDeal(deal)}
                    onViewHistory={onViewHistory}
                  />
                </div>
              )}
            </Draggable>
          ))
        )}
      </div>
    </div>
  );
};

export default PipelineColumn;
