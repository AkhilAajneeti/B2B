import React from "react";
import Icon from "../../../components/AppIcon";
import { BRAND, BRAND_SOFT } from "../theme";

/**
 * A row of highlighted cards that map a configured value to a resulting one —
 * used to show weightage → percentage conversions at a glance.
 *
 * Section shape:
 *   { type: "badges", items: [{ label: "1 : 3", value: "25% : 75%", note? }] }
 */
const BadgeCards = ({ items = [] }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {items.map((item, i) => (
      <div
        key={i}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Weightage
        </div>
        <div className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">
          {item.label}
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-slate-400">
          <Icon name="ArrowDown" size={13} />
          <span className="text-[11px] font-medium uppercase tracking-wide">
            converts to
          </span>
        </div>
        <div
          className="mt-2 inline-flex items-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums"
          style={{ backgroundColor: BRAND_SOFT, color: BRAND }}
        >
          {item.value}
        </div>
        {item.note && (
          <div className="mt-2 text-xs text-slate-500 leading-relaxed">
            {item.note}
          </div>
        )}
      </div>
    ))}
  </div>
);

export default BadgeCards;
