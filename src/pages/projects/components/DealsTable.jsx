import React, { useState, useMemo } from "react";
import { isOwnRecord, getStoredUser } from "../../../utils/permission.js";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Checkbox";

const DealsTable = ({
  deals,
  selectedDeals,
  onSelectDeal,
  onSelectAll,
  onDealClick,
  sortConfig,
  onSort,
  // currentPage / itemsPerPage no longer destructured — pagination is fully
  // server-side now. Parent still passes them as props (harmless) but the
  // table treats `deals` as the already-paged slice.
  onDelete,
  isLoading,
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);

  const formatDate = (date) => {
    if (!date) return "—"; // null / undefined / empty

    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) return "—"; // invalid date
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })?.format(new Date(date));
  };

  const getStageColor = (stage) => {
    const colors = {
      Started: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Deffered: "bg-orange-100 text-danger-800",
      Canceled: "bg-purple-100 text-purple-800",
      "Not Started": "bg-gray-100 text-gray-700",
    };

    return colors?.[stage] || "bg-gray-100 text-gray-800";
  };
  const getPrioriyColor = (stage) => {
    const colors = {
      Low: "bg-blue-100 text-blue-800",
      Normal: "bg-green-100 text-green-800",
      High: "bg-orange-100 text-danger-800",
      Urgent: "bg-purple-100 text-purple-800",
    };

    return colors?.[stage] || "bg-gray-100 text-gray-800";
  };

  // Avatar palette for the assignee pill. Same colors as the deals-page
  // DealsTable and AssignedUserChart so a rep's avatar color stays the
  // same across modules — visual continuity.
  const ASSIGNEE_PALETTE = [
    "#6366F1", "#22C55E", "#F59E0B", "#EF4444",
    "#06B6D4", "#8B5CF6", "#EC4899", "#14B8A6",
  ];
  const getNameColor = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) >>> 0;
    return ASSIGNEE_PALETTE[hash % ASSIGNEE_PALETTE.length];
  };
  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    // First + last initial — "Rishab Saxena" → "RS".
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return (
        <Icon name="ArrowUpDown" size={16} className="text-muted-foreground" />
      );
    }
    return sortConfig?.direction === "asc" ? (
      <Icon name="ArrowUp" size={16} className="text-primary" />
    ) : (
      <Icon name="ArrowDown" size={16} className="text-primary" />
    );
  };

  const handleQuickAction = (e, action, deal) => {
    e?.stopPropagation();
    onDealClick(deal);
    console.log(`${action} action for deal:`, deal?.id);
  };
  const handleDelete = async (e, deal) => {
    e.stopPropagation();
    const ok = window.confirm(`Delete Task ${deal?.name}?`);
    if (!ok) return;

    await onDelete(deal.id); // 👈 parent ko bol rahe ho
  };

  // `deals` is already a single page of results from the backend (parent
  // fetches via useProjects({ page, limit })). Slicing it again with
  // currentPage/itemsPerPage was double-paginating — on page 2, deals had
  // ~25 items but slice([25, 50]) returned [] and rendered an empty table,
  // making pagination look broken. Use `deals` as-is.
  const paginatedDeals = useMemo(() => deals || [], [deals]);

  const isAllSelected =
    selectedDeals?.length === paginatedDeals?.length &&
    paginatedDeals?.length > 0;
  const isIndeterminate =
    selectedDeals?.length > 0 && selectedDeals?.length < paginatedDeals?.length;

  const SkeletonRow = () => (
    <tr className="animate-pulse border-t border-border">
      {/* Checkbox */}
      <td className="p-4">
        <div className="h-4 w-4 bg-gray-300/60 rounded"></div>
      </td>

      {/* Company */}
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300/60 rounded-lg"></div>
          <div>
            <div className="h-4 w-24 bg-gray-300/70 rounded mb-1"></div>
            <div className="h-3 w-32 bg-gray-300/50 rounded"></div>
          </div>
        </div>
      </td>

      {/* Industry */}
      <td className="p-4">
        <div className="h-4 w-20 bg-gray-300/60 rounded"></div>
      </td>

      {/* Type */}
      <td className="p-4">
        <div className="h-4 w-16 bg-gray-300/60 rounded"></div>
      </td>

      {/* status */}
      <td className="p-4">
        <div className="h-4 w-24 bg-gray-300/60 rounded"></div>
      </td>


      {/* Actions */}
      <td className="p-4">
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-300/60 rounded"></div>
          <div className="h-8 w-8 bg-gray-300/60 rounded"></div>
        </div>
      </td>
    </tr>
  );
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => onSelectAll(e?.target?.checked)}
                />
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("name")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Campaign Name</span>
                  {getSortIcon("name")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  Assigned User
                </span>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("createdAt")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Create By</span>
                  {getSortIcon("closeDate")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("createdAt")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Modified At</span>
                  {getSortIcon("closeDate")}
                </button>
              </th>
              <th className="w-24 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : !paginatedDeals?.length ? (
              <tr>
                <td colSpan="6">
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    No Campaigns available
                  </div>
                </td>
              </tr>
            ) : (paginatedDeals?.map((deal) => (
              <tr
                key={deal?.id}
                onMouseEnter={() => setHoveredRow(deal?.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className="hover:bg-sky-50 cursor-pointer transition-smooth"
              >
                <td className="px-4 py-4">
                  <Checkbox
                    checked={selectedDeals?.includes(deal?.id)}
                    onChange={(e) => {
                      e?.stopPropagation();
                      onSelectDeal(deal?.id, e?.target?.checked);
                    }}
                  />
                </td>
                <td className="px-4 py-4" onClick={() => onDealClick(deal)}>
                  <div className="font-medium text-foreground">
                    {deal?.projectNomen || "Default"}
                  </div>
                </td>

                <td className="px-4 py-4">
                  {deal?.assignedUserName ? (
                    <div className="inline-flex items-center gap-2 pl-1 pr-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors max-w-full">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{
                          backgroundColor: getNameColor(deal.assignedUserName),
                        }}
                      >
                        {getInitials(deal.assignedUserName)}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {deal.assignedUserName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="text-sm text-foreground">
                    {formatDate(deal?.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-foreground">
                    {formatDate(deal?.modifiedAt)}
                  </div>
                </td>

                <td className="px-4 py-4">
                  <div
                    className={`flex items-center space-x-1 transition-opacity`} >
                    {isOwnRecord(deal, getStoredUser()) ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleQuickAction(e, "edit", deal)}
                          className="h-8 w-8"
                        >
                          <Icon name="Edit" size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, deal)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </>
                    ) : (
                      // Non-owner fallback — gives the column SOMETHING
                      // to click instead of empty space. Opens the same
                      // overview drawer that clicking the project name
                      // does (via the shared onDealClick handler).
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDealClick(deal);
                        }}
                        className="h-8 w-8 text-sky-600 hover:text-sky-700"
                        aria-label="View project"
                      >
                        <Icon name="Eye" size={14} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      {/* Mobile Task / Deal Cards */}
      <div className="md:hidden">
        {paginatedDeals?.map((deal) => (
          <div
            key={deal?.id}
            onClick={() => onDealClick(deal)}
            className="p-4 border-b border-border bg-background hover:bg-sky-50 transition"
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <Checkbox
                checked={selectedDeals?.includes(deal?.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelectDeal(deal?.id, e.target.checked);
                }}
                className="mt-1"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {deal?.name}
                  </h3>


                </div>

                {/* Project Name */}
                {deal?.name && (
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {deal?.address}
                  </div>
                )}

                {/* Assigned User — same avatar pill style as desktop so the
                    rep's color stays consistent when the layout switches. */}
                {deal?.assignedUserName && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Assigned to
                    </span>
                    <div className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{
                          backgroundColor: getNameColor(deal.assignedUserName),
                        }}
                      >
                        {getInitials(deal.assignedUserName)}
                      </span>
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {deal.assignedUserName}
                      </span>
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Icon name="Calendar" size={12} />
                  Created: {formatDate(deal?.createdAt)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealsTable;
