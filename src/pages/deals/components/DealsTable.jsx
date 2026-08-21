import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import { Checkbox } from "../../../components/ui/Checkbox";
import QuickEditSheet from "./QuickEditSheet";

const DealsTable = ({
  deals,
  selectedDeals,
  onSelectDeal,
  onSelectAll,
  onDealClick,
  sortConfig,
  onSort,
  canEdit = () => true,
  canDelete = () => true,
  onDelete,
  // Quick post-call update from the mobile card's bottom sheet. Same signature
  // as the drawer's onUpdate: (id, payload) => Promise. Optional — the Quick
  // Edit affordance only renders when a handler is supplied.
  onQuickUpdate,
  isLoading,
}) => {
  const [hoveredRow, setHoveredRow] = useState(null);
  // The lead whose Quick Edit bottom sheet is open (mobile only). null = closed.
  const [quickEditDeal, setQuickEditDeal] = useState(null);

  const formatDate = (date) => {
    if (!date) return "—"; // null / undefined / empty

    const safe =
      typeof date === "string" && date.length > 10
        ? `${date.replace(" ", "T")}Z`
        : date;
    const parsedDate = new Date(safe);

    if (isNaN(parsedDate.getTime())) return "—"; // invalid date
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })?.format(parsedDate);
  };

  // Same parsing as formatDate, but returns just the time (e.g. "10:00 AM").
  const formatTime = (date) => {
    if (!date) return "";
    const safe =
      typeof date === "string" && date.length > 10
        ? `${date.replace(" ", "T")}Z`
        : date;
    const parsed = new Date(safe);
    if (isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })?.format(parsed);
  };

  // Soft status-tinted gradient for the mobile lead card background. Mirrors
  // the same palette as getStageColor so the card and the status badge feel
  // visually connected. Whole class strings (not concatenated) so the
  // Tailwind JIT can statically discover every variant.
  const getStageGradient = (stage) => {
    // Mirrors the semantic getStageColor palette so the mobile card tint and
    // the status badge share the same hue per category.
    const gradients = {
      New: "bg-gradient-to-br from-blue-50/70 to-background border-blue-100",

      // Green — progressing
      "Follow up":
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      Interested:
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      "Site Visit Scheduled":
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      "Invitation Sent":
        "bg-gradient-to-br from-emerald-50/70 to-background border-emerald-100",
      "Site Visit Done":
        "bg-gradient-to-br from-emerald-100/70 to-background border-emerald-200",
      Purchased:
        "bg-gradient-to-br from-emerald-100/80 to-background border-emerald-200",

      // Yellow — trying to reach
      "Call Later":
        "bg-gradient-to-br from-yellow-50/70 to-background border-yellow-100",
      "Call Not Connecting":
        "bg-gradient-to-br from-yellow-50/70 to-background border-yellow-100",
      "Call Not Picked":
        "bg-gradient-to-br from-yellow-100/70 to-background border-yellow-200",
      "Switch Off":
        "bg-gradient-to-br from-yellow-100/70 to-background border-yellow-200",

      // Violet — auto-qualified
      QDTD: "bg-gradient-to-br from-violet-50/70 to-background border-violet-100",

      // Slate — admin
      Duplicate:
        "bg-gradient-to-br from-slate-100/70 to-background border-slate-200",

      // Red — not a fit → lost / junk
      "Low Budget":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      "Low Interest":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      "Other Location":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      "Irrelevant Lead":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      "Not Interested":
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      Broker:
        "bg-gradient-to-br from-red-50/70 to-background border-red-100",
      Dead:
        "bg-gradient-to-br from-red-100/70 to-background border-red-200",
      "Fake Lead":
        "bg-gradient-to-br from-red-100/70 to-background border-red-200",
      "Invalid Number":
        "bg-gradient-to-br from-red-100/80 to-background border-red-200",
    };

    return (
      gradients?.[stage] ||
      "bg-gradient-to-br from-background to-muted/20 border-border/50"
    );
  };

  const getStageColor = (stage) => {
    // Semantic status palette — hue = category, depth = progress/intensity.
    // Opaque light shades (not /opacity tints) because the app themes via CSS
    // tokens with no Tailwind `dark:` variants: a solid light chip stays
    // readable on both light and dark rows. Whole class strings so the JIT can
    // statically discover every variant.
    const colors = {
      // Blue — new / neutral start
      New: "bg-blue-50 text-blue-700 border border-blue-200",

      // Green — progressing toward a sale, deepening to the win
      "Follow up": "bg-emerald-50 text-emerald-700 border border-emerald-200",
      Interested: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      "Site Visit Scheduled":
        "bg-emerald-200 text-emerald-800 border border-emerald-300",
      "Invitation Sent":
        "bg-emerald-200 text-emerald-800 border border-emerald-300",
      "Site Visit Done": "bg-emerald-300 text-emerald-900 border border-emerald-400",
      Purchased: "bg-emerald-600 text-white border border-emerald-600 shadow-sm",

      // Yellow — trying to reach / no response (caution, keep trying)
      "Call Later": "bg-yellow-50 text-yellow-700 border border-yellow-200",
      "Call Not Connecting": "bg-yellow-100 text-yellow-800 border border-yellow-200",
      "Call Not Picked": "bg-yellow-200 text-yellow-800 border border-yellow-300",
      "Switch Off": "bg-yellow-300 text-yellow-900 border border-yellow-400",

      // Violet — auto-qualified (its own colour so it never blends in)
      QDTD: "bg-violet-100 text-violet-800 border border-violet-300",

      // Slate — admin / housekeeping
      Duplicate: "bg-slate-100 text-slate-600 border border-slate-200",

      // Red — not a fit (light) → firm no → junk (solid dark)
      "Low Budget": "bg-red-50 text-red-700 border border-red-200",
      "Low Interest": "bg-red-50 text-red-700 border border-red-200",
      "Other Location": "bg-red-50 text-red-700 border border-red-200",
      "Irrelevant Lead": "bg-red-50 text-red-700 border border-red-200",
      "Not Interested": "bg-red-100 text-red-700 border border-red-200",
      Broker: "bg-red-100 text-red-700 border border-red-200",
      Dead: "bg-red-200 text-red-800 border border-red-300",
      "Fake Lead": "bg-red-300 text-red-900 border border-red-400",
      "Invalid Number": "bg-red-600 text-white border border-red-600 shadow-sm",
    };

    return colors?.[stage] || "bg-slate-100 text-slate-600 border border-slate-200";
  };

  const getSourceColor = (source) => {
    // normalize value
    const normalizedSource = source
      ?.trim() // remove extra spaces start/end
      ?.replace(/\s+/g, " ") // multiple spaces -> single space
      ?.toLowerCase();

    const colors = {
      call: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      email: "bg-blue-50 text-blue-700 border border-blue-200",
      "existing customer":
        "bg-violet-50 text-violet-700 border border-violet-200",
      partner: "bg-orange-50 text-orange-700 border border-orange-200",
      meta: "bg-orange-100 text-orange-700 border border-orange-200",
      "public relations": "bg-pink-50 text-pink-700 border border-pink-200",
      "web site": "bg-cyan-50 text-cyan-700 border border-cyan-200",
      campaign: "bg-amber-50 text-amber-700 border border-amber-200",
      other: "bg-slate-100 text-slate-700 border border-slate-200",
      acl: "bg-gradient-to-r from-fuchsia-50 to-violet-50 text-violet-700 border border-violet-200 shadow-sm",
    };

    return (
      colors?.[normalizedSource] ||
      "bg-gray-100 text-gray-700 border border-gray-200"
    );
  };

  // Avatar palette for the assignee pill. Same colors as
  // AssignedUserChart so a rep's avatar stays the same across the deals
  // table and the analytics chart — visual continuity.
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

  // Sort key is used for BOTH the click handler and the arrow indicator, so
  // the arrow actually lights up on the column you clicked (they were
  // mismatched before — e.g. onSort("Status") vs getSortIcon("owner")).
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

  // Hands the whole deal up to the page, which opens the shared
  // ConfirmDeleteModal (same dialog the bulk delete uses). No window.confirm.
  const handleDelete = (e, deal) => {
    e.stopPropagation();
    onDelete?.(deal);
  };

  const openWhatsapp = (e, deal) => {
    e.stopPropagation();
    const phone = deal?.phoneNumber?.replace(/\D/g, "");
    if (!phone) return;
    window.open(
      `https://api.whatsapp.com/send/?phone=${phone}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const paginatedDeals = deals;
  const isAllSelected =
    selectedDeals?.length === paginatedDeals?.length &&
    paginatedDeals?.length > 0;
  const isIndeterminate =
    selectedDeals?.length > 0 && selectedDeals?.length < paginatedDeals?.length;

  const SkeletonRow = () => (
    <tr className="animate-pulse border-t border-border">
      <td className="p-4">
        <div className="h-4 w-4 bg-gray-300/60 rounded"></div>
      </td>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="p-4">
          <div className={`h-4 bg-gray-300/60 rounded ${i === 0 ? "w-24" : "w-20"}`}></div>
        </td>
      ))}
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
              <SortHeader label="Name" column="name" />
              <SortHeader label="Project Name" column="cProjectName" />
              <SortHeader label="Source" column="source" />
              <SortHeader label="Status" column="status" />
              <SortHeader label="Next Contact" column="cNextContactAt" />
              <SortHeader label="Create At" column="createdAt" />
              <th className="text-left px-4 py-3">
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  Assigned User
                </span>
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
                <td colSpan="9">
                  <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                    No leads available
                  </div>
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {paginatedDeals?.map((deal) => (
                <motion.tr
                  key={deal?.id}
                  layout
                  // Deleted rows flash red and slide out rather than blinking
                  // away, so the delete reads as an action, not a glitch.
                  exit={{
                    opacity: 0,
                    x: -60,
                    backgroundColor: "rgba(254, 226, 226, 1)",
                    transition: { duration: 0.28, ease: "easeIn" },
                  }}
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
                    <div className="font-medium text-foreground capitalize">
                      {deal?.name}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-foreground">
                      {deal?.cProject ||
                        deal?.cProjectName ||
                        deal?.cProjectNomen ||
                        "None"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div
                      className={`font-medium flex justify-center items-center space-x-2 py-1 px-2 rounded-full ${getSourceColor(
                        deal?.cSubSource,
                      )}`}
                    >
                      {deal?.cSubSource
                        ? deal?.cSubSource
                        : deal?.source?.toLowerCase() === "acl"
                          ? "Aajneeti"
                          : deal?.source}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div
                      className={`flex justify-center items-center space-x-2 px-2 py-1 font-medium rounded-full ${getStageColor(
                        deal?.status,
                      )}`}
                    >
                      <span className="text-sm">{deal?.status}</span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex px-1 py-1 text-xs font-medium rounded-full whitespace-nowrap">
                      {formatDate(deal?.cNextContactAt)}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="whitespace-nowrap leading-tight">
                      <div className="text-sm font-medium text-foreground">
                        {formatDate(deal?.createdAt)}
                      </div>
                      {formatTime(deal?.createdAt) && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <Icon name="Clock" size={11} className="shrink-0" />
                          {formatTime(deal?.createdAt)}
                        </div>
                      )}
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
                        <span className="text-sm font-medium text-slate-700 truncate capitalize">
                          {deal.assignedUserName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <div
                      className={`flex items-center space-x-1 transition-opacity ${
                        hoveredRow === deal?.id ? "opacity-100" : "opacity-50"
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDealClick(deal);
                        }}
                        className="h-8 w-8"
                      >
                        <Icon name="Edit" size={14} />
                      </Button>

                      {/* WhatsApp */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => openWhatsapp(e, deal)}
                        className="h-8 w-8 rounded-full hover:bg-green-100 transition-all duration-200"
                      >
                        <img
                          src="/assets/whatsapp-logo.png"
                          alt="WhatsApp"
                          className="w-5 h-5 object-contain"
                        />
                      </Button>

                      {canDelete(deal) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, deal)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Icon name="Trash2" size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
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
            No leads available
          </div>
        ) : (
          paginatedDeals?.map((deal) => (
            <div
              key={deal?.id}
              className={`
    mx-3 my-2 p-4 rounded-2xl border
    ${getStageGradient(deal?.status)}
    hover:shadow-md
    active:scale-[0.99]
    transition-all duration-200
  `}
            >
              <div className="flex gap-3">
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
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate capitalize">
                        {deal?.name}
                      </h3>

                      {deal?.cProjectName && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {deal?.cProjectName}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <span
                      className={`
            px-2.5 py-1 rounded-full
            text-[10px] font-medium
            whitespace-nowrap
            ${getStageColor(deal?.status)}
          `}
                    >
                      {deal?.status}
                    </span>
                  </div>

                  {/* Bottom */}
                  <div className="flex items-end justify-between mt-3 gap-3">
                    <div className="space-y-1 min-w-0">
                      {/* Assigned */}
                      {deal?.assignedUserName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon name="User2" size={12} />
                          <span className="truncate capitalize">
                            {deal?.assignedUserName}
                          </span>
                        </div>
                      )}
                      {/* project */}
                      {deal?.cProject && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon name="Building2" size={12} />
                          <span className="truncate">{deal?.cProject}</span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon name="Calendar" size={12} />
                        <span>{formatDate(deal?.createdAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Quick Edit — opens the bottom sheet for a fast
                          post-call update (status / note / follow-up) without
                          leaving the list. Only shown when the page wires an
                          onQuickUpdate handler. */}
                      {onQuickUpdate && canEdit(deal) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Quick update lead"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickEditDeal(deal);
                          }}
                          className="h-10 w-10 rounded-full hover:bg-primary/10 active:scale-95 transition-all duration-150 flex items-center justify-center"
                        >
                          <Icon
                            name="PencilLine"
                            size={19}
                            className="text-primary"
                          />
                        </Button>
                      )}

                      {/* Call — opens the device dialer via tel: */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Call lead"
                        onClick={(e) => {
                          e.stopPropagation();
                          const phone = deal?.phoneNumber?.replace(/\D/g, "");
                          if (!phone) return;
                          window.location.href = `tel:${phone}`;
                        }}
                        className="h-10 w-10 rounded-full hover:bg-blue-400 active:scale-95 transition-all duration-150 flex items-center justify-center"
                      >
                        <Icon
                          name="PhoneCall"
                          size={20}
                          className="text-blue-600 hover:text-white"
                        />
                      </Button>

                      {/* WhatsApp */}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Open WhatsApp chat"
                        onClick={(e) => openWhatsapp(e, deal)}
                        className="h-10 w-10 rounded-full hover:bg-[#1fb85557] active:scale-95 transition-all duration-150 flex items-center justify-center"
                      >
                        <img
                          src="/assets/whatsapp-logo.png"
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Edit bottom sheet — mobile only, rendered once and driven by
          quickEditDeal so it can animate cleanly on open/close. */}
      <QuickEditSheet
        open={!!quickEditDeal}
        deal={quickEditDeal}
        onClose={() => setQuickEditDeal(null)}
        onSave={onQuickUpdate}
      />
    </div>
  );
};

export default React.memo(DealsTable);
