import React, { useState, useMemo } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Checkbox";
import { deleteLead } from "services/leads.service";

const DealsTable = ({
  deals,
  selectedDeals,
  onDealClick,
  sortConfig,
  onSort,
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
      New: "bg-blue-50 text-blue-700 border border-blue-200",
      Interested:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
      "Follow up":
        "bg-indigo-50 text-indigo-700 border border-indigo-200",
      "Call Later":
        "bg-amber-50 text-amber-700 border border-amber-200",
      "Call Not Connecting":
        "bg-rose-50 text-rose-700 border border-rose-200",
      "Call Not Picked":
        "bg-red-50 text-red-700 border border-red-200",
      Broker:
        "bg-violet-50 text-violet-700 border border-violet-200",
      Dead:
        "bg-slate-100 text-slate-700 border border-slate-300",
      "Fake Lead":
        "bg-pink-50 text-pink-700 border border-pink-200",
      "Invalid Number":
        "bg-gray-100 text-gray-700 border border-gray-300",
      "Irrelevant Lead":
        "bg-orange-50 text-orange-700 border border-orange-200",
      "Low Budget":
        "bg-yellow-50 text-yellow-700 border border-yellow-200",
      "Low Interest":
        "bg-lime-50 text-lime-700 border border-lime-200",
      "Not Interested":
        "bg-red-50 text-red-700 border border-red-200",
      "Other Location":
        "bg-cyan-50 text-cyan-700 border border-cyan-200",
      Purchased:
        "bg-green-50 text-green-700 border border-green-200 shadow-sm",
      "Site Visit Done":
        "bg-teal-50 text-teal-700 border border-teal-200",
      "Site Visit Scheduled":
        "bg-sky-50 text-sky-700 border border-sky-200",
      "Switch Off":
        "bg-neutral-100 text-neutral-700 border border-neutral-300",
    };

    return (
      colors?.[stage] ||
      "bg-gray-100 text-gray-700 border border-gray-200"
    );
  };
  const getSourceColor = (source) => {
    const colors = {
      Call: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      Email: "bg-blue-50 text-blue-700 border border-blue-200",
      "Existing Customer":
        "bg-violet-50 text-violet-700 border border-violet-200",
      Partner:
        "bg-orange-50 text-orange-700 border border-orange-200",
      "Public Relations":
        "bg-pink-50 text-pink-700 border border-pink-200",
      "Web Site":
        "bg-cyan-50 text-cyan-700 border border-cyan-200",
      Campaign:
        "bg-amber-50 text-amber-700 border border-amber-200",
      Other:
        "bg-slate-100 text-slate-700 border border-slate-200",
      ACL:
        "bg-gradient-to-r from-fuchsia-50 to-violet-50 text-violet-700 border border-violet-200 shadow-sm",
    };
    return (
      colors?.[source] ||
      "bg-gray-100 text-gray-700 border border-gray-200"
    );
  };

  const getStageGradient = (stage) => {
    const gradients = {
      New: "bg-gradient-to-br from-blue-50/70 to-background border-blue-100",
      Interested:
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      "Follow up":
        "bg-gradient-to-br from-indigo-50/70 to-background border-indigo-100",
      "Call Later":
        "bg-gradient-to-br from-amber-50/70 to-background border-amber-100",
      "Call Not Connecting":
        "bg-gradient-to-br from-rose-50/70 to-background border-rose-100",
      "Call Not Picked":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      Broker:
        "bg-gradient-to-br from-violet-50/70 to-background border-violet-100",
      Dead: "bg-gradient-to-br from-slate-100/70 to-background border-slate-200",
      "Fake Lead":
        "bg-gradient-to-br from-pink-50/70 to-background border-pink-100",
      "Invalid Number":
        "bg-gradient-to-br from-gray-100/70 to-background border-gray-200",
      "Irrelevant Lead":
        "bg-gradient-to-br from-orange-50/70 to-background border-orange-100",
      "Low Budget":
        "bg-gradient-to-br from-yellow-50/70 to-background border-yellow-100",
      "Low Interest":
        "bg-gradient-to-br from-lime-50/70 to-background border-lime-100",
      "Not Interested":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      "Other Location":
        "bg-gradient-to-br from-cyan-50/70 to-background border-cyan-100",
      Purchased:
        "bg-gradient-to-br from-green-50/70 to-background border-green-100",
      "Site Visit Done":
        "bg-gradient-to-br from-teal-50/70 to-background border-teal-100",
      "Site Visit Scheduled":
        "bg-gradient-to-br from-sky-50/70 to-background border-sky-100",
      "Switch Off":
        "bg-gradient-to-br from-neutral-100/70 to-background border-neutral-200",
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
    const ok = window.confirm(`Delete lead ${deal?.name}?`);
    if (!ok) return;

    await onDelete(deal.id); // 👈 parent ko bol rahe ho
  };

  // `deals` is already a single page of results from the backend
  // (parent fetches via `useNewLeads({ limit, page, filters })`). Slicing it
  // again with currentPage/itemsPerPage was double-paginating — page 2 was
  // trying to slice indices [10..20] of a 10-item page array, giving []
  // back and rendering an empty table. Use `deals` as-is.
  const paginatedDeals = useMemo(() => deals || [], [deals]);

  const isAllSelected =
    selectedDeals?.length === paginatedDeals?.length &&
    paginatedDeals?.length > 0;
  const isIndeterminate =
    selectedDeals?.length > 0 && selectedDeals?.length < paginatedDeals?.length;
  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-4">
        <div className="h-4 w-24 bg-gray-300/70 rounded"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-32 bg-gray-300/60 rounded"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-20 bg-gray-300/60 rounded"></div>
      </td>
      <td className="px-4 py-4">
        <div className="h-5 w-16 bg-gray-300/60 rounded-full"></div>
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
                  onClick={() => onSort("account")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Project Name</span>
                  {getSortIcon("Project Name")}
                </button>
              </th>
              <th className="text-left px-4 py-3">
                <button
                  onClick={() => onSort("Source")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Source</span>
                  {getSortIcon("value")}
                </button>
              </th>
              <th className="d-flex justify-content-center px-4 py-3">
                <button
                  onClick={() => onSort("Status")}
                  className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
                >
                  <span>Status</span>
                  {getSortIcon("owner")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
            ) : !paginatedDeals?.length ? (
              <tr>
                <td colSpan="4">
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    No leads available
                  </div>
                </td>
              </tr>
            ) : (
              paginatedDeals?.map((deal) => (
                <tr
                  key={deal?.id}
                  onMouseEnter={() => setHoveredRow(deal?.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className="hover:bg-muted/30 cursor-pointer transition-smooth"
                >
                  <td className="px-4 py-4" onClick={() => onDealClick(deal)}>
                    <div className="font-medium text-foreground">
                      {deal?.name}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-foreground">{deal?.cProjectName || deal?.cProject || "None"}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className={`flex justify-center items-center space-x-2 px-2 py-1 font-medium rounded-full ${getSourceColor(
                      deal?.source,
                    )}`}>
                      {deal?.source === "ACL" ? "Aajneeti" : deal?.source}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}

      <div className="md:hidden">
        {paginatedDeals?.map((deal) => (
          <div
            key={deal?.id}
            onClick={() => onDealClick(deal)}
            className={`
    mx-3 my-2 p-4 rounded-2xl border
    ${getStageGradient(deal?.status)}
    hover:shadow-md
    active:scale-[0.99]
    transition-all duration-200
  `}
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

                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${getStageColor(
                      deal?.status,
                    )}`}
                  >
                    {deal?.status}
                  </span>
                </div>

                {/* Project Name */}
                {deal?.cProjectName && (
                  <div className="text-sm text-muted-foreground mt-1 truncate">
                    {deal?.cProjectName}
                  </div>
                )}

                {/* Assigned User */}
                {deal?.assignedUserName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Icon name="User" size={12} />
                    Assigned to{" "}
                    <span className="truncate">{deal?.assignedUserName}</span>
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
