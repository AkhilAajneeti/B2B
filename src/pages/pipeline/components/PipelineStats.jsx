import React, { memo } from "react";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import { STAT_CARDS } from "../utils/pipelineConstants";

/**
 * PipelineStats
 *
 * Six summary cards. Each card is also a toggle filter: clicking it selects
 * its category (the parent then shows only that column); clicking the active
 * card clears it. `activeCategory` drives the highlighted state.
 */
const PipelineStats = ({ stats = {}, activeCategory = null, onSelect }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    {STAT_CARDS.map((card, index) => {
      const active = card.category === activeCategory;
      return (
        <motion.button
          key={card.key}
          type="button"
          onClick={() => onSelect?.(card.category)}
          aria-pressed={active}
          title={active ? `Clear ${card.title} filter` : `Show only ${card.title}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          className={`${card.bgColor} rounded-xl border p-4 text-left transition-shadow ${
            active
              ? "border-primary shadow-md ring-2 ring-primary/60"
              : "border-border hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-11 w-11 ${card.color} flex flex-shrink-0 items-center justify-center rounded-xl`}
            >
              <Icon name={card.icon} size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold leading-none text-foreground">
                {stats[card.key] ?? 0}
              </div>
              <div
                className={`mt-1 truncate text-xs ${
                  active ? "font-medium text-primary" : "text-muted-foreground"
                }`}
              >
                {card.title}
              </div>
            </div>
          </div>
        </motion.button>
      );
    })}
  </div>
);

export default memo(PipelineStats);
