import React from "react";
import { BRAND_SOFT, BRAND } from "../theme";

/**
 * A responsive documentation table. Horizontally scrolls on small screens so
 * wide tables never break the page layout.
 *
 * Section shape:
 *   { type: "table", headers: [...], rows: [[...], ...],
 *     align?: ["left"|"right"|"center", ...], caption? }
 *
 * `align` is per-column and optional (defaults to "left", except the last
 * column which defaults to "right" for number-heavy tables).
 */
const HelpTable = ({ headers = [], rows = [], align = [], caption }) => {
  const alignClass = (i) => {
    const a = align[i] || (i === headers.length - 1 ? "right" : "left");
    return a === "right"
      ? "text-right"
      : a === "center"
        ? "text-center"
        : "text-left";
  };

  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr style={{ backgroundColor: BRAND_SOFT }}>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-2.5 font-semibold whitespace-nowrap ${alignClass(i)}`}
                  style={{ color: BRAND }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={r}
                className={`border-t border-slate-100 ${
                  r % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                }`}
              >
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`px-4 py-2.5 text-slate-700 ${alignClass(c)} ${
                      c === 0 ? "font-medium text-slate-900" : ""
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <figcaption className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default HelpTable;
