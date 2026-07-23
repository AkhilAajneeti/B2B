import React, { useState, useMemo } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Checkbox";
import { canEditRecord } from "utils/permission";

const DealsTable = ({
  deals,
  selectedDeals,
  onSelectDeal,
  onSelectAll,
  onDealClick,
  sortConfig,
  onSort,
  currentPage,
  itemsPerPage,
  onDelete,
  isLoading,
  canEdit = true,
  canDelete = true,
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
  // Read the logged-in user safely — bare JSON.parse(null) throws, and the
  // bug below previously compared an entire user OBJECT to an assignedUserId
  // STRING, which is always false → edit button hidden for everyone.
  // `currentUserId` extracted explicitly to fix both at once.
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("login_object"))?.id || null;
    } catch {
      return null;
    }
  })();

  const canEditDeal = (deal) =>
    canEditRecord("Task", deal) &&
    deal?.assignedUserId === currentUserId;
  const getStageColor = (stage) => {
    const colors = {
      Started: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Deffered: "bg-slate-200 text-slate-200",
      Canceled: "bg-purple-100 text-purple-800",
      "Not Started": "bg-orange-100 text-orange-700",
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

  const getStageGradient = (stage) => {
    const gradients = {
      Started: "bg-gradient-to-br from-blue-50/70 to-background border-blue-100",
      Completed:
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      Canceled:
        "bg-gradient-to-br from-indigo-50/70 to-background border-indigo-100",
      Broker:
        "bg-gradient-to-br from-violet-50/70 to-background border-violet-100",
      Deferred: "bg-gradient-to-br from-slate-100/70 to-background border-slate-200",
      "Not Started":
        "bg-gradient-to-br from-orange-50/70 to-background border-orange-100",
    };

    return (
      gradients?.[stage] ||
      "bg-gradient-to-br from-background to-muted/20 border-border/50"
    );
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

  const paginatedDeals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return deals?.slice(startIndex, startIndex + itemsPerPage);
  }, [deals, currentPage, itemsPerPage]);

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
      {/* Next Contact */}
      <td className="p-4">
        <div className="h-4 w-24 bg-gray-300/60 rounded"></div>
      </td>
      {/* Created At */}
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
                  <span>Name</span>
                  {getSortIcon("name")}
                </button>
              </th>

              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("Status")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Status</span>
                  {getSortIcon("owner")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("Source")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Priority</span>
                  {getSortIcon("value")}
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
                <td colSpan="8">
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    No task available
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
                  <div className="font-medium text-foreground truncate max-w-[280px]">
                    {deal?.name}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div
                    className={`flex justify-center items-center space-x-2 px-2 py-1 font-medium rounded-full ${getStageColor(
                      deal?.status,
                    )}`}
                  >
                    <span className={`text-sm text-foreg roundunded-full `}>
                      {deal?.status}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-4">
                  <div
                    className={`flex justify-center items-center space-x-2 px-2 py-1 font-medium rounded-full ${getPrioriyColor(
                      deal?.priority,
                    )}`}
                  >
                    {deal?.priority}
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
                    className={`flex items-center space-x-1 transition-opacity ${hoveredRow === deal?.id ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    {canEdit && (<Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleQuickAction(e, "view", deal)}
                      className="h-8 w-8"
                    >
                      <Icon name="Edit" size={14} />
                    </Button>)}

                    {canDelete && (<Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, deal)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>)}
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
            className={` mx-3 my-2 p-4 rounded-2xl border ${getStageGradient(deal?.status)} hover:shadow-md active:scale-[0.99] transition-all duration-200`}>
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
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onDealClick(deal)}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {deal?.name}
                  </h3>

                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${getStageColor(
                      deal?.status,
                    )}`}
                  >
                    {deal?.status}
                  </span>
                </div>

                {/* Project Name */}
                {deal?.name && (
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {deal?.name}
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
