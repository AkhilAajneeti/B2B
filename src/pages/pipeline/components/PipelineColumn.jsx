import React, { memo, useState } from "react";
import Icon from "../../../components/AppIcon";
import DealCard from "./DealCard";
import { Draggable } from "@hello-pangea/dnd";
import { URGENCY_STYLES } from "../utils/pipelineConstants";
import { formatCurrency } from "../utils/pipelineHelpers";

/**
 * How many cards a column renders before it stops and offers a button.
 *
 * The column used to render EVERY deal it was given, and the service fetches
 * every lead in the date window — which on a busy month put ~64,600 elements
 * on the page against a normal page's ~1,000, and locked the browser for about
 * six seconds on every visit.
 *
 * This caps what is RENDERED, not what is loaded. `deals` is untouched, so the
 * header count, the column total and every statistic above the board still
 * describe the full set. Only the DOM is bounded.
 */
const INITIAL_VISIBLE_CARDS = 20;
const LOAD_MORE_STEP = 20;

/**
 * PipelineColumn - presentation only.
 *
 * Renders one kanban column for a category. Colour + header styling come from
 * the static URGENCY_STYLES map keyed by the column id, so there is no styling
 * logic computed here.
 */
const PipelineColumn = ({ column, deals = [], onDeleteDeal, onViewHistory }) => {
  const urgency = URGENCY_STYLES[column.id] || {};
  const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);
  const visibleDeals = deals.slice(0, visibleCount);
  const hiddenCount = deals.length - visibleDeals.length;

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-xl border border-border">
      {/* Column header */}
      <div className="p-4 border-b border-border bg-background/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border ${
                urgency.columnHeader || "bg-gray-100 text-gray-800 border-gray-200"
              }`}
            >
              <Icon name={column.icon} size={14} />
              {column.name}
            </span>
            <span className="text-sm font-medium text-foreground bg-muted px-2 py-1 rounded-full">
              {deals.length}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{column.description}</p>
        {totalValue > 0 && (
          <p className="text-sm font-semibold text-foreground mt-1">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Deals */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[100vh] transition-colors">
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
              <Icon
                name={column.icon}
                size={24}
                className="text-muted-foreground"
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              No leads in {column.name}
            </p>
          </div>
        ) : (
          visibleDeals.map((deal, index) => (
            <Draggable key={deal.id} draggableId={String(deal.id)} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={snapshot.isDragging ? "opacity-90" : ""}
                >
                  <DealCard
                    deal={deal}
                    onDelete={onDeleteDeal}
                    onViewHistory={onViewHistory}
                  />
                </div>
              )}
            </Draggable>
          ))
        )}

        {/* Reveals the rest of a column in steps. Deliberately a button rather
            than infinite scroll on scroll position: the column is already
            inside a scroll container the user drags cards around in, and
            auto-loading on scroll would fight the drag gesture. */}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + LOAD_MORE_STEP)}
            className="w-full rounded-lg border border-dashed border-border bg-background/60 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-background hover:text-primary"
          >
            Show {Math.min(hiddenCount, LOAD_MORE_STEP)} more
            <span className="ml-1 text-muted-foreground/70">
              ({hiddenCount} hidden)
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

// Memoized: a column re-renders only when its own deals array changes.
export default memo(PipelineColumn);
