import React from "react";
import Icon from "../../../components/AppIcon";
import { brandBg, BRAND } from "../theme";

/**
 * A simple left-to-right flow diagram of labelled steps joined by arrows.
 * Wraps onto multiple lines on narrow screens; the arrow rotates to point
 * down when a step wraps below the previous one.
 *
 * Section shape:
 *   { type: "flow", items: ["Configure Weightage", "Convert to Percentage", ...] }
 */
const FlowDiagram = ({ items = [] }) => (
  <div className="flex flex-wrap items-stretch gap-2">
    {items.map((label, i) => (
      <React.Fragment key={i}>
        <div
          className="flex-1 min-w-[130px] rounded-xl border px-3 py-2.5 text-center shadow-sm"
          style={{ borderColor: `${BRAND}33`, backgroundColor: "#fff" }}
        >
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-semibold mb-1.5 shadow-sm"
            style={brandBg}
          >
            {i + 1}
          </span>
          <div className="text-[13px] font-medium leading-snug text-slate-800">
            {label}
          </div>
        </div>
        {i < items.length - 1 && (
          <div className="flex items-center justify-center shrink-0 text-slate-300">
            <Icon name="ChevronRight" size={18} />
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

export default FlowDiagram;
