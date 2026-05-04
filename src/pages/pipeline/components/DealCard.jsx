import React, { useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";

const DealCard = ({ deal = {}, onEdit, onDelete, onClone, onViewHistory }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return "No Date";
    return new Date(dateString.replace(" ", "T")).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-100 text-gray-700";

    if (status.toLowerCase().includes("budget"))
      return "bg-red-100 text-red-700";

    if (status.toLowerCase().includes("interested"))
      return "bg-green-100 text-green-700";

    if (status.toLowerCase().includes("follow"))
      return "bg-yellow-100 text-yellow-700";

    return "bg-blue-100 text-blue-700";
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", deal?.id);
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // SAME COLUMN REORDER
    if (destination.droppableId === source.droppableId) {
      const columnDeals = deals.filter(
        (deal) => deal.stage === source.droppableId,
      );

      const movedDeal = columnDeals[source.index];

      const newColumnDeals = Array.from(columnDeals);
      newColumnDeals.splice(source.index, 1);
      newColumnDeals.splice(destination.index, 0, movedDeal);

      const otherDeals = deals.filter(
        (deal) => deal.stage !== source.droppableId,
      );

      setDeals([...otherDeals, ...newColumnDeals]);
      return;
    }

    // DIFFERENT COLUMN MOVE
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === draggableId
          ? { ...deal, stage: destination.droppableId }
          : deal,
      ),
    );

    toast.success("Stage updated successfully");
  };

  return (
    <motion.div
      className={`relative bg-card border border-border rounded-lg p-4 cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? "opacity-50 scale-105" : ""
      }`}
      draggable
      // onDragStart={handleDragStart}
      // onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -2 }}
      layout
    >
      {/* Action Buttons */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex space-x-1 bg-white border rounded-md shadow p-1 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewHistory(deal.id)}
          >
            <Icon name="Edit2" size={14} />
          </Button>
          {/* <Button variant="ghost" size="icon" onClick={onClone}>
            <Icon name="Copy" size={14} />
          </Button> */}
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {/* Lead Name */}
        <div>
          <h3 className="font-semibold text-base">
            {deal?.title || deal?.firstName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {deal?.cProject || "No Project"}
          </p>
        </div>

        {/* Status Badge */}
        <div>
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
              deal?.status,
            )}`}
          >
            {deal?.status}
          </span>
        </div>

        {/* Source */}
        <div className="flex items-center space-x-2 text-sm">
          <Icon name="Globe" size={14} />
          <span>{deal?.source}</span>
        </div>

        {/* Assigned User */}
        <div className="flex items-center space-x-2 text-sm">
          <Icon name="User" size={14} />
          <span>{deal?.owner?.name}</span>
        </div>

        {/* Next Contact */}
        <div className="flex items-center space-x-2 text-sm">
          <Icon name="Calendar" size={14} />
          <span>{formatDate(deal?.cNextContact)}</span>
        </div>

        {/* Site Visit */}
        {deal?.cSiteVisitAt && (
          <div className="flex items-center space-x-2 text-sm text-green-600">
            <Icon name="CheckCircle" size={14} />
            <span>Site Visit: {formatDate(deal?.cSiteVisitAt)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DealCard;
