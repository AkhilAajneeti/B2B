/**
 * ImportResultTable
 *
 * Compact table used twice on the Step 3 overview — once for "Imported" and
 * once for "Duplicates". Six fixed columns matching the EspoCRM import
 * detail layout: Name, Phone, Project, Status, Created At, Next Contact.
 * Title + accent-dot color are passed in so the same component renders
 * both sections.
 */

import React from "react";
import { formatShortDateTime, leadStatusClass } from "./utils";

const ImportResultTable = ({
  title,
  accent = "bg-fuchsia-500",
  rows = [],
  totalFromResult = 0,
}) => {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <span className={`w-2.5 h-2.5 rounded-sm ${accent}`} />
        <h3 className="font-semibold text-foreground">
          {title}
          {totalFromResult > 0 && (
            <span className="text-muted-foreground font-normal ml-2">
              ({totalFromResult.toLocaleString()})
            </span>
          )}
        </h3>
      </div>
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            No {title.toLowerCase()} records
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-normal">Name</th>
                <th className="text-left px-4 py-2 font-normal">Phone</th>
                <th className="text-left px-4 py-2 font-normal">Project</th>
                <th className="text-left px-4 py-2 font-normal">Status</th>
                <th className="text-left px-4 py-2 font-normal">Created At</th>
                <th className="text-left px-4 py-2 font-normal">
                  Next Contact
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2 text-primary font-medium truncate max-w-[140px]">
                    {r.name || "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground truncate max-w-[140px]">
                    {r.phoneNumber || "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground truncate max-w-[140px]">
                    {r.cProject || "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.status ? (
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${leadStatusClass(r.status)}`}
                      >
                        {r.status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-foreground whitespace-nowrap">
                    {formatShortDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-foreground whitespace-nowrap">
                    {r.cNextContactAt
                      ? formatShortDateTime(r.cNextContactAt)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ImportResultTable;
