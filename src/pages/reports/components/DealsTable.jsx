import React, { useMemo } from "react";
import Icon from "../../../components/AppIcon";

/**
 * Read-only leads table for the Reports page. Acting on a lead (open/edit/
 * delete) lives on the Deals page — this surface is purely for scanning,
 * comparing, and sorting. No row click, no checkboxes, no bulk actions.
 */
const DealsTable = ({ deals, sortConfig, onSort, isLoading }) => {
  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  };

  const getStatusTag = (status) => {
    const colors = {
      New: "bg-blue-50 text-blue-700 border-blue-200",
      Interested: "bg-emerald-50 text-emerald-700 border-emerald-200",
      "Follow up": "bg-indigo-50 text-indigo-700 border-indigo-200",
      "Call Later": "bg-amber-50 text-amber-700 border-amber-200",
      "Call Not Connecting": "bg-rose-50 text-rose-700 border-rose-200",
      "Call Not Picked": "bg-red-50 text-red-700 border-red-200",
      Broker: "bg-violet-50 text-violet-700 border-violet-200",
      Dead: "bg-slate-100 text-slate-600 border-slate-300",
      "Fake Lead": "bg-pink-50 text-pink-700 border-pink-200",
      "Invalid Number": "bg-gray-100 text-gray-600 border-gray-300",
      "Irrelevant Lead": "bg-orange-50 text-orange-700 border-orange-200",
      "Low Budget": "bg-yellow-50 text-yellow-700 border-yellow-200",
      "Low Interest": "bg-lime-50 text-lime-700 border-lime-200",
      "Not Interested": "bg-red-50 text-red-700 border-red-200",
      "Other Location": "bg-cyan-50 text-cyan-700 border-cyan-200",
      Purchased: "bg-green-50 text-green-700 border-green-200",
      "Site Visit Done": "bg-teal-50 text-teal-700 border-teal-200",
      "Site Visit Scheduled": "bg-sky-50 text-sky-700 border-sky-200",
      "Switch Off": "bg-neutral-100 text-neutral-600 border-neutral-300",
      QDTD: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
      Duplicate: "bg-slate-100 text-slate-600 border-slate-300",
    };
    return colors?.[status] || "bg-gray-100 text-gray-600 border-gray-200";
  };

  const getSourceTag = (source) => {
    const colors = {
      Call: "bg-emerald-50 text-emerald-700",
      Email: "bg-blue-50 text-blue-700",
      "Existing Customer": "bg-violet-50 text-violet-700",
      Partner: "bg-orange-50 text-orange-700",
      "Public Relations": "bg-pink-50 text-pink-700",
      "Web Site": "bg-cyan-50 text-cyan-700",
      Campaign: "bg-amber-50 text-amber-700",
      facebook: "bg-blue-50 text-blue-700",
      IVR: "bg-slate-100 text-slate-600",
      Other: "bg-slate-100 text-slate-600",
      ACL: "bg-violet-50 text-violet-700",
    };
    return colors?.[source] || "bg-slate-100 text-slate-600";
  };

  const AVATAR = ["#6E1420", "#0F766E", "#B45309", "#4338CA", "#BE123C", "#0369A1"];
  const initials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const avatarColor = (name = "") =>
    AVATAR[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR.length];

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={16} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === "asc" ? (
      <Icon name="ArrowUp" size={16} className="text-primary" />
    ) : (
      <Icon name="ArrowDown" size={16} className="text-primary" />
    );
  };

  const SortHeader = ({ label, column, align = "left" }) => (
    <th className={`px-6 py-4 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort?.(column)}
        className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span>{label}</span>
        {getSortIcon(column)}
      </button>
    </th>
  );

  const rows = useMemo(() => deals || [], [deals]);

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-6 py-5">
          <div className={`h-4 rounded bg-muted ${i === 0 ? "w-36" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );

  const StatusTag = ({ status }) => (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${getStatusTag(status)}`}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-70" />
      {status || "—"}
    </span>
  );

  const SourceTag = ({ source }) =>
    source ? (
      <span className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-semibold ${getSourceTag(source)}`}>
        {source === "ACL" ? "Aajneeti" : source}
      </span>
    ) : (
      <span className="text-sm text-muted-foreground">—</span>
    );

  const Assignee = ({ name }) =>
    name ? (
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-sm"
          style={{ backgroundColor: avatarColor(name) }}
        >
          {initials(name)}
        </span>
        <span className="truncate text-[14px] font-medium capitalize text-foreground">{name}</span>
      </div>
    ) : (
      <span className="text-sm text-muted-foreground">Unassigned</span>
    );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-muted">
        <Icon name="SearchX" size={26} className="text-muted-foreground/60" />
      </span>
      <p className="text-sm text-muted-foreground">No leads match these filters</p>
    </div>
  );

  return (
    <div className="bg-card">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <SortHeader label="Name" column="name" />
              <th className="px-6 py-4 text-left">
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground">
                  Project
                </span>
              </th>
              <SortHeader label="Source" column="source" />
              <SortHeader label="Status" column="status" />
              <SortHeader label="Assigned" column="assignedUserName" />
              <SortHeader label="Created" column="createdAt" align="right" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : !rows.length ? (
              <tr>
                <td colSpan="6">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              rows.map((deal) => (
                <tr
                  key={deal?.id}
                  className="border-b border-border/60 transition-colors even:bg-muted/[0.18] last:border-b-0 hover:bg-sky-50"
                >
                  <td className="px-6 py-4">
                    <span className="text-[17px] font-semibold capitalize text-foreground">
                      {deal?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[14px] text-muted-foreground">
                      {deal?.cProjectName || deal?.cProject || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <SourceTag source={deal?.source} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusTag status={deal?.status} />
                  </td>
                  <td className="px-6 py-4">
                    <Assignee name={deal?.assignedUserName} />
                  </td>
                  <td className="px-6 py-4 text-right text-[14px] tabular-nums text-muted-foreground">
                    {formatDate(deal?.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-border/60 md:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse p-5">
              <div className="mb-2.5 h-4 w-36 rounded bg-muted" />
              <div className="h-3.5 w-28 rounded bg-muted" />
            </div>
          ))
        ) : !rows.length ? (
          <EmptyState />
        ) : (
          rows.map((deal) => (
            <div key={deal?.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate text-[17px] font-semibold capitalize text-foreground">
                  {deal?.name}
                </h3>
                <StatusTag status={deal?.status} />
              </div>

              {(deal?.cProjectName || deal?.cProject) && (
                <div className="mt-1 truncate text-[13px] text-muted-foreground">
                  {deal?.cProjectName || deal?.cProject}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <SourceTag source={deal?.source} />
                <Assignee name={deal?.assignedUserName} />
              </div>

              <div className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <Icon name="Calendar" size={13} />
                Created {formatDate(deal?.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DealsTable;
