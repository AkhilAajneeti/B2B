import React, { useState, useMemo } from "react";
import { isOwnRecord, getStoredUser, isSupAdmin } from "../../../utils/permission.js";
import Icon from "../../../components/AppIcon";
import { buildMembers } from "../utils/distribution";
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

  // Sort key drives BOTH the click handler and the arrow indicator, so the
  // arrow lights up on the column you actually clicked (they were mismatched
  // before — e.g. onSort("createdAt") vs getSortIcon("closeDate")).
  /**
 * At-a-glance distribution for one campaign.
 *
 * Reads the campaign's own fields — no extra request — so the whole table can
 * show it without costing anything. "Round robin" means enableConfiguration is
 * off and leads split evenly; "Custom" means fixed per-person numbers.
 */
const DistributionCell = ({ deal }) => {
  const members = buildMembers({
    collaboratorsIds: deal?.collaboratorsIds,
    collaboratorsNames: deal?.collaboratorsNames,
    configuration: deal?.configuration,
  });
  const paused = members.filter((m) => m.paused).length;
  const active = members.length - paused;
  const custom = !!deal?.enableConfiguration;

  if (!members.length) {
    return (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Not set up
      </span>
    );
  }

  return (
    <div className="whitespace-nowrap">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          custom
            ? "bg-indigo-50 text-indigo-700 dark:text-indigo-300 border border-indigo-200"
            : "bg-emerald-50 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
        }`}
      >
        {custom ? "Custom" : "Round robin"}
      </span>
      <span className="ml-2 text-xs text-muted-foreground">
        {active} member{active === 1 ? "" : "s"}
      </span>
      {/* Paused is called out rather than folded into the count: with no
          return date stored, nothing else reminds anyone to switch someone
          back on, and a rep can sit paused for weeks on quietly falling
          numbers. */}
      {paused > 0 && (
        <span className="ml-2 rounded-full bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300 border border-orange-200">
          {paused} paused
        </span>
      )}
    </div>
  );
};

const SortHeader = ({ label, column }) => (
    <th className="text-left px-4 py-3">
      <button
        type="button"
        onClick={() => onSort?.(column)}
        className="flex items-center space-x-2 text-sm font-medium text-foreground hover:text-primary transition-smooth"
      >
        <span className="whitespace-nowrap">{label}</span>
        {getSortIcon(column)}
      </button>
    </th>
  );

  const handleQuickAction = (e, action, deal) => {
    e?.stopPropagation();
    onDealClick(deal);
    console.log(`${action} action for deal:`, deal?.id);
  };
  const handleDelete = async (e, deal) => {
    e.stopPropagation();
    const ok = window.confirm(`Delete Project ${deal?.name}?`);
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
    <div className="bg-card">
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
              <SortHeader label="Project Name" column="name" />
              <th className="text-left px-4 py-3">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Assigned User
                </span>
              </th>
              {/* Lead distribution, visible on every row. This column IS the
                  discoverability answer: the feature used to live behind an
                  "Enable Configuration" checkbox inside a tab, where nobody
                  would ever find it unless told. */}
              <th className="text-left px-4 py-3">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Distribution
                </span>
              </th>
              <SortHeader label="Created At" column="createdAt" />
              <SortHeader label="Modified At" column="modifiedAt" />
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
                <td colSpan="7">
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    No projects available
                  </div>
                </td>
              </tr>
            ) : (paginatedDeals?.map((deal) => (
              <tr
                key={deal?.id}
                onMouseEnter={() => setHoveredRow(deal?.id)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onDealClick(deal)}
                className="hover:bg-sky-50 cursor-pointer transition-smooth"
              >
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedDeals?.includes(deal?.id)}
                    onChange={(e) => {
                      e?.stopPropagation();
                      onSelectDeal(deal?.id, e?.target?.checked);
                    }}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-foreground">
                    {deal?.projectNomen || "Default"}
                  </div>
                  {/* Client nomen — admins only (type=admin). */}
                  {isSupAdmin() && deal?.clientNomen && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {deal.clientNomen}
                    </div>
                  )}
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
                  <DistributionCell deal={deal} />
                </td>

                <td className="px-4 py-4">
                  <div className="text-sm text-foreground whitespace-nowrap">
                    {formatDate(deal?.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-foreground whitespace-nowrap">
                    {formatDate(deal?.modifiedAt)}
                  </div>
                </td>

                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
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
                        className="h-8 w-8 text-sky-600 dark:text-sky-300 hover:text-sky-700 dark:hover:text-sky-300"
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
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse p-4">
                <div className="mb-2 h-4 w-32 rounded bg-gray-300/60" />
                <div className="h-3 w-24 rounded bg-gray-300/50" />
              </div>
            ))}
          </div>
        ) : !paginatedDeals?.length ? (
          <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
            No projects available
          </div>
        ) : (
          <div className="space-y-4 px-3 pb-4 pt-5">
            {paginatedDeals.map((deal) => {
              const selected = selectedDeals?.includes(deal?.id);
              return (
                <div
                  key={deal?.id}
                  onClick={() => onDealClick(deal)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${
                    selected
                      ? "border-[#6E1420]/40 ring-1 ring-[#6E1420]/20"
                      : "border-border"
                  }`}
                >
                  {/* A maroon rail marks the row as a project, and thickens
                      when it is selected — the checkbox alone was the only
                      selection cue and it is easy to miss at arm's length. */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 ${
                      selected ? "w-1.5 bg-[#6E1420]" : "w-1 bg-[#6E1420]/25"
                    }`}
                  />

                  <div className="flex items-start gap-3 pl-1.5">
                    <Checkbox
                      checked={selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        onSelectDeal(deal?.id, e.target.checked);
                      }}
                      className="mt-0.5"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-[15px] font-semibold text-foreground">
                          {deal?.name}
                        </h3>
                        <Icon
                          name="ChevronRight"
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        />
                      </div>

                      {/* The project's short name, not the address — the
                          address is blank on most records, so that line was
                          usually missing entirely. Same rule the project
                          cards use: projectNomen unless it is the "Default"
                          placeholder, in which case the full name. Hidden
                          when it would just repeat the title above. */}
                      {(() => {
                        const projectName =
                          deal?.projectNomen &&
                          deal.projectNomen !== "Default"
                            ? deal.projectNomen
                            : deal?.name;
                        if (!projectName || projectName === deal?.name)
                          return null;
                        return (
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                            <Icon name="Layers" size={12} className="shrink-0" />
                            <span className="truncate">{projectName}</span>
                          </p>
                        );
                      })()}

                      {/* Assigned rep and the created date share one footer
                          row behind a divider, so the card has a head and a
                          foot rather than four stacked lines. */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-3">
                        {deal?.assignedUserName && (
                          <div className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-0.5 pl-0.5 pr-2.5">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                              style={{
                                backgroundColor: getNameColor(
                                  deal.assignedUserName,
                                ),
                              }}
                            >
                              {getInitials(deal.assignedUserName)}
                            </span>
                            <span className="truncate text-xs font-medium text-slate-700">
                              {deal.assignedUserName}
                            </span>
                          </div>
                        )}

                        <span className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Icon name="Calendar" size={12} />
                          {formatDate(deal?.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsTable;
