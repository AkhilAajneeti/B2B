/**
 * ImportTable
 *
 * Desktop sortable table + mobile card layout for the imports list. Pure
 * presentational — receives the row data, selection state, sort state, and
 * callbacks from the page. Owns no fetching or filter logic.
 */

import React from "react";
import Button from "components/ui/Button";
import { Checkbox } from "components/ui/Checkbox";
import Icon from "components/AppIcon";
import { formatCreatedAt, getStatusBadge } from "./utils";

const ImportTable = ({
  rows,
  isLoading,
  selectedIds,
  isAllSelected,
  isIndeterminate,
  orderBy,
  order,
  onSort,
  onToggleRow,
  onToggleAll,
  // Fires when the rep clicks an import's Created At cell (desktop) or
  // the entire card (mobile). Parent uses this to open the drawer in
  // overview mode with the clicked import's id.
  onRowClick,
}) => {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => onToggleAll(e?.target?.checked)}
                />
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("createdAt")}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  Created At
                  <Icon
                    name={
                      orderBy === "createdAt"
                        ? order === "asc"
                          ? "ArrowUp"
                          : "ArrowDown"
                        : "ArrowUpDown"
                    }
                    size={14}
                    className={
                      orderBy === "createdAt"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Entity Type
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-foreground">
                Created By
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-4">
                    <div className="h-4 w-4 bg-gray-300/60 rounded" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-32 bg-gray-300/60 rounded" />
                  </td>
                  <td className="p-4">
                    <div className="h-5 w-20 bg-gray-300/60 rounded-full" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-20 bg-gray-300/60 rounded" />
                  </td>
                  <td className="p-4">
                    <div className="h-4 w-28 bg-gray-300/60 rounded" />
                  </td>
                  <td className="p-4" />
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  No imports found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onChange={() => onToggleRow(row.id)}
                    />
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => onRowClick?.(row.id)}
                      className="text-primary font-medium hover:underline cursor-pointer"
                    >
                      {formatCreatedAt(row.createdAt)}
                    </button>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(row.status)}`}
                    >
                      {row.status || "—"}
                    </span>
                  </td>
                  <td className="p-4 text-foreground">
                    {row.entityType || "—"}
                  </td>
                  <td className="p-4 text-foreground">
                    {row.createdByName || "—"}
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="icon">
                      <Icon name="ChevronDown" size={16} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border-b border-border animate-pulse"
            >
              <div className="h-4 w-32 bg-gray-300/60 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-300/60 rounded" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No imports found
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="p-4 border-b border-border cursor-pointer hover:bg-muted/30"
              onClick={() => onRowClick?.(row.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm text-primary font-medium truncate">
                    {formatCreatedAt(row.createdAt)}
                  </p>
                  <p className="text-sm text-foreground mt-1 truncate">
                    {row.entityType || "—"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${getStatusBadge(row.status)}`}
                >
                  {row.status || "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon name="User" size={12} />
                <span className="truncate">{row.createdByName || "—"}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ImportTable;
