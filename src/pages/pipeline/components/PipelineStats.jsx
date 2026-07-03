import React, { memo } from "react";
import { STAT_CARDS } from "../utils/pipelineConstants";

/**
 * PipelineStats
 *
 * Compact filter chips grouped into two sections. Each chip toggles its
 * category as the board filter; the active chip is highlighted with the
 * primary brand color. Counts come pre-computed from usePipelineStats.
 */

// category id per stat key, sourced from the shared config.
const CATEGORY_BY_KEY = Object.fromEntries(
  STAT_CARDS.map((c) => [c.key, c.category]),
);

const GROUPS = [
  {
    heading: "Follow-ups · when to call",
    items: [
      { key: "overdue", label: "Overdue", dot: "bg-red-500" },
      { key: "dueToday", label: "Due today", dot: "bg-amber-500" },
      { key: "upcoming", label: "Upcoming", dot: "bg-blue-500" },
    ],
  },
  {
    heading: "Watch list · needs a look",
    items: [
      { key: "active", label: "Active", dot: "bg-emerald-500" },
      { key: "stale", label: "Stale", dot: "bg-slate-400" },
      { key: "budgetIssue", label: "Budget issue", dot: "bg-[#AC2334]" },
    ],
  },
];

const Chip = ({ item, count, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    title={active ? `Clear ${item.label} filter` : `Show only ${item.label}`}
    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
      active
        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/40"
        : "border-border bg-background text-foreground hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
    {item.label}
    <span
      className={`font-semibold ${
        count > 0 ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {count}
    </span>
  </button>
);

const PipelineStats = ({ stats = {}, activeCategory = null, onSelect }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-10">
      {GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.heading}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const category = CATEGORY_BY_KEY[item.key];
              return (
                <Chip
                  key={item.key}
                  item={item}
                  count={stats[item.key] ?? 0}
                  active={category === activeCategory}
                  onClick={() => onSelect?.(category)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default memo(PipelineStats);
