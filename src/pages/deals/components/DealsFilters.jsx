import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import RoleGuard from "components/RoleGuard";
import { useTeams } from "hooks/useTeams";
import { todayLocal } from "../../../utils/dateFilter";
import { isSupAdmin } from "utils/permission";

const DealsFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  total,
  onBulkAction,
  selectedCount,
  toggleAnalytics,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [assignUser, setAssignUser] = useState([]);

  // Delete action is destructive and irreversible — admin-only. The
  // `isSupAdmin()` check returns true only when user.type === "admin"
  // (owners/managers don't qualify). Builds the list conditionally so
  // non-admins never see the Delete button at all.
  const bulkActions = [
    { value: "mass-update", label: "Mass Update", icon: "GitBranch" },
    ...(isSupAdmin()
      ? [{ value: "delete", label: "Delete Selected", icon: "Trash2", destructive: true }]
      : []),
  ];


  const sourceOptions = [
    { value: "Call", label: "Call" },
    { value: "Email", label: "Email" },
    { value: "Existing Customer", label: "Existing Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Public Relations", label: "Public Relations" },

    { value: "Web Site", label: "Web Site" },
    { value: "Campaign", label: "Campaign" },
    { value: "Aajneeti", label: "Aajneeti" },
    { value: "Meta", label: "Meta" },
    { value: "Other", label: "Other" },
  ];
  const statusOptions = [
    { value: "Broker", label: "Broker" },
    { value: "QDTD", label: "Qualify Due To Delay" },
    { value: "Call Later", label: "Call Later" },
    { value: "Call Not Connecting", label: "Call Not Connecting" },
    { value: "Call Not Picked", label: "Call Not Picked" },
    { value: "Dead", label: "Dead" },
    { value: "Fake Lead", label: "Fake Lead" },
    { value: "Follow up", label: "Follow up" },
    { value: "Interested", label: "Interested" },
    { value: "Invalid Number", label: "Invalid Number" },
    { value: "Irrelevant Lead", label: "Irrelevant Lead" },
    { value: "Low Budget", label: "Low Budget" },
    { value: "Low Interest", label: "Low Interest" },
    { value: "New", label: "New" },
    { value: "Not Interested", label: "Not Interested" },
    { value: "Other Location", label: "Other Location" },
    { value: "Purchased", label: "Purchased" },
    { value: "Site Visit Done", label: "Site Visit Done" },
    { value: "Site Visit Scheduled", label: "Site Visit Scheduled" },
    { value: "Switch Off", label: "Switch Off" },
  ];
  const ACTIVITY_DATE_FILTERS = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "lastSevenDays" },
    { label: "Current Month", value: "currentMonth" },
    { label: "Last Month", value: "lastMonth" },
    // { label: "Next Month", value: "nextMonth" },
    { label: "Current Quarter", value: "currentQuarter" },
    { label: "Last Quarter", value: "lastQuarter" },


    // special — user-driven date pickers. Values stay the same so the
    // backend filter builder and showDateInputs logic don't change.
    { label: "Specific Day", value: "on" },
    { label: "Before a Date", value: "before" },
    { label: "After a Date", value: "after" },
    { label: "Date Range", value: "between" },
    { label: "Last X Days", value: "lastXDays" },
    { label: "Current Year", value: "currentYear" },
    { label: "Last Year", value: "lastYear" },
    { label: "Past", value: "past" },
    { label: "Future", value: "future" },
    // { label: "Ever", value: "ever" },
    // { label: "Is Empty", value: "isEmpty" },
    // { label: "After X Days", value: "afterXDays" },
  ];
  // showDateInputs is still used by the Lead Analytics button's col-span
  // logic below. The detailed X-days / DateInputs flags moved into
  // renderDateConditional; the only outer gate we still need is the
  // wrapping-grid one for Next Contact (so an empty grid doesn't render
  // when no extra inputs apply).
  //
  // Both filter keys are kept independent so a rep can have BOTH active at
  // once (e.g. "leads created this month AND next contact scheduled this
  // week"). Backend maps `nextContactType` to the `cNextContact` attribute.
  const showDateInputs = ["on", "before", "after", "between"].includes(filters?.dateType);
  // Wrapper-grid gate for the activity-date conditional inputs (so an empty
  // grid doesn't render when no extra inputs apply).
  const showDateConditional =
    showDateInputs || ["lastXDays", "afterXDays"].includes(filters?.dateType);
  const showNextContactConditional =
    ["on", "before", "after", "between"].includes(filters?.nextContactType) ||
    ["lastXDays", "afterXDays"].includes(filters?.nextContactType);
  const handleFilterChange = (key, value) => {
    let updated = {
      ...filters,
      [key]: value,
    };

    // 🔥 reset dependent fields when dateType changes
    if (key === "dateType") {
      updated.closeDateFrom = "";
      updated.closeDateTo = "";
      updated.xDays = "";
    }

    // Same reset logic for the Next Contact filter's dependents.
    if (key === "nextContactType") {
      updated.nextContactFrom = "";
      updated.nextContactTo = "";
      updated.nextContactXDays = "";
    }

    onFiltersChange(updated);
  };

  const renderDateConditional = ({
    type,
    fromKey,
    toKey,
    xDaysKey,
    maxToday,
  }) => {
    const showXDays = ["lastXDays", "afterXDays"].includes(type);
    const showRange = ["on", "before", "after", "between"].includes(type);
    if (!showXDays && !showRange) return null;

    const maxAttr = maxToday ? todayLocal() : undefined;

    return (
      <>
        {showXDays && (
          <Input
            type="number"
            placeholder="Enter days"
            value={filters?.[xDaysKey] || ""}
            onChange={(e) => handleFilterChange(xDaysKey, e.target.value)}
          />
        )}

        {showRange && (
          <div
            className={`flex gap-2 ${type === "between" ? "lg:col-span-2" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <Input
                type="date"
                label={
                  {
                    on: "Pick a date",
                    before: "Before this date",
                    after: "From this date",
                    between: "From",
                  }[type]
                }
                max={maxAttr}
                value={filters?.[fromKey] || ""}
                onChange={(e) =>
                  handleFilterChange(fromKey, e.target.value)
                }
              />
            </div>

            {type === "between" && (
              <div className="flex-1 min-w-0">
                <Input
                  type="date"
                  label="To"
                  max={maxAttr}
                  min={filters?.[fromKey] || undefined}
                  value={filters?.[toKey] || ""}
                  onChange={(e) =>
                    handleFilterChange(toKey, e.target.value)
                  }
                />
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    fetchUser()
      .then((res) => setAssignUser(res.list || []))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  const handleBulkActionSelect = (action) => {
    onBulkAction(action);
    setShowBulkActions(false);
  };

  const activeFiltersCount = Object.values(filters)?.filter((value) => {
    if (value === "" || value === null || value === undefined) return false;
    // Multi-select fields (e.g. status) carry an array — empty array
    // means no filter applied, so don't count it as active.
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  })?.length;
  const assignUserOptions = assignUser.map((acc) => ({
    value: acc.id, // 👈 important (ID use karo)
    label: acc.name,
  }));

  // Teams list — cached via React Query, only fetched once until staleTime expires.
  const { data: teamsData } = useTeams();
  const teamOptions = (teamsData?.list || []).map((t) => ({
    value: t.id,
    label: t.name,
  }));

  // Build a flat list of "pills" — one per active filter — so the
  // header can show actual filter values + per-pill X to remove them,
  // instead of an opaque "3 filters active" count. Each pill has its
  // own `onRemove` closure so removing one doesn't touch the others.
  //
  // Status is a multi-select: emit ONE pill per selected value so the
  // rep can drop "Follow up" while keeping "Interested" applied.
  //
  // The two date filters (dateType for createdAt, nextContactType for
  // cNextContact) compose with multiple dependent fields (from/to/
  // xDays). Removing the date pill clears all of its dependents in
  // one onFiltersChange so the form doesn't end up with an orphaned
  // "From" date and no date type.
  const activePills = (() => {
    const pills = [];

    if (filters?.search) {
      pills.push({
        key: "search",
        label: "Search",
        value: filters.search,
        onRemove: () => handleFilterChange("search", ""),
      });
    }

    // Status — array → one pill per value
    if (Array.isArray(filters?.status) && filters.status.length > 0) {
      filters.status.forEach((s) => {
        pills.push({
          key: `status-${s}`,
          label: "Status",
          value: s,
          onRemove: () =>
            handleFilterChange(
              "status",
              filters.status.filter((x) => x !== s),
            ),
        });
      });
    } else if (typeof filters?.status === "string" && filters.status) {
      // Legacy string shape (saved tabState from before multi-select).
      pills.push({
        key: "status",
        label: "Status",
        value: filters.status,
        onRemove: () => handleFilterChange("status", []),
      });
    }

    if (filters?.cProject) {
      pills.push({
        key: "cProject",
        label: "Project",
        value: filters.cProject,
        onRemove: () => handleFilterChange("cProject", ""),
      });
    }

    if (filters?.source) {
      const labelMatch = sourceOptions.find(
        (o) => o.value === filters.source,
      );
      pills.push({
        key: "source",
        label: "Source",
        value: labelMatch?.label || filters.source,
        onRemove: () => handleFilterChange("source", ""),
      });
    }

    if (filters?.assignUser) {
      const userMatch = assignUserOptions.find(
        (o) => o.value === filters.assignUser,
      );
      pills.push({
        key: "assignUser",
        label: "Assigned",
        value: userMatch?.label || filters.assignUser,
        onRemove: () => handleFilterChange("assignUser", ""),
      });
    }

    if (filters?.team) {
      const teamMatch = teamOptions.find((o) => o.value === filters.team);
      pills.push({
        key: "team",
        label: "Team",
        value: teamMatch?.label || filters.team,
        onRemove: () => handleFilterChange("team", ""),
      });
    }

    // Helper — formats a date-filter group (dateType + from/to/xDays)
    // into a human-readable value string. Returns just the date-type
    // label when no dependent fields are set yet.
    const formatDateValue = (typeKey, fromKey, toKey, xDaysKey) => {
      const dateLabel =
        ACTIVITY_DATE_FILTERS.find((o) => o.value === filters[typeKey])
          ?.label || filters[typeKey];
      if (
        filters[xDaysKey] &&
        ["lastXDays", "afterXDays"].includes(filters[typeKey])
      ) {
        return `${dateLabel}: ${filters[xDaysKey]} days`;
      }
      if (
        filters[fromKey] &&
        filters[toKey] &&
        filters[typeKey] === "between"
      ) {
        return `${filters[fromKey]} → ${filters[toKey]}`;
      }
      if (filters[fromKey]) {
        return `${dateLabel}: ${filters[fromKey]}`;
      }
      return dateLabel;
    };

    if (filters?.dateType) {
      pills.push({
        key: "dateType",
        label: "Created",
        value: formatDateValue(
          "dateType",
          "closeDateFrom",
          "closeDateTo",
          "xDays",
        ),
        onRemove: () =>
          onFiltersChange({
            ...filters,
            dateType: "",
            closeDateFrom: "",
            closeDateTo: "",
            xDays: "",
          }),
      });
    }

    if (filters?.nextContactType) {
      pills.push({
        key: "nextContactType",
        label: "Next Contact",
        value: formatDateValue(
          "nextContactType",
          "nextContactFrom",
          "nextContactTo",
          "nextContactXDays",
        ),
        onRemove: () =>
          onFiltersChange({
            ...filters,
            nextContactType: "",
            nextContactFrom: "",
            nextContactTo: "",
            nextContactXDays: "",
          }),
      });
    }

    return pills;
  })();

  // No `overflow-hidden` on the wrapper — that was clipping the Select
  // dropdown panels. Header strip below gets its own `rounded-t-xl` so
  // the tinted gradient still hugs the outer card's rounded top corners.
  return (
    <div className="bg-card border border-border rounded-xl mb-6 shadow-sm">
      {/* Header strip — soft slate gradient + Target icon + count.
          Active filter pills wrap onto the second visual row inside
          the strip so even 10+ pills don't break the layout. */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-transparent border-b border-border rounded-t-xl">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex items-start gap-3 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="Target" size={14} className="text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Leads
                <span className="ml-1.5 text-sm font-medium text-muted-foreground tabular-nums">
                  ({total?.toLocaleString?.() ?? total})
                </span>
              </h2>
            </div>
            {/* Active filter pills — one per applied filter (or per
                array value for Status). Each pill has an X that removes
                that specific filter without touching the others. */}
            {activePills.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {activePills.map((pill) => (
                  <span
                    key={pill.key}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20"
                  >
                    <span className="text-primary/60">{pill.label}:</span>
                    <span className="text-primary font-semibold">
                      {pill.value}
                    </span>
                    <button
                      type="button"
                      onClick={pill.onRemove}
                      className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${pill.label} filter`}
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </span>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden w-full shrink-0"
          >
            <Icon name="SlidersHorizontal" size={14} className="mr-1.5" />
            Filters
            <Icon
              name="ChevronDown"
              size={14}
              className={`ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Selection toolbar — slides in when checkboxes are selected.
          Soft pastel violet so it reads as "active mode" without neon
          saturation. Destructive actions get a rose treatment so reps
          don't fire delete by accident; Mass Update keeps the neutral
          white-on-violet pill. */}
      {selectedCount > 0 && (
        <div className="relative px-5 py-3 bg-gradient-to-r from-violet-100/80 via-fuchsia-100/70 to-pink-100/80 border-b border-violet-200/60">
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/80 ring-1 ring-violet-200 flex items-center justify-center text-violet-600">
                <Icon name="CheckCircle2" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-violet-900">
                  {selectedCount} lead{selectedCount !== 1 ? "s" : ""} selected
                </p>
                <p className="text-[11px] text-violet-700/70 leading-tight mt-0.5">
                  Pick an action to apply to all
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {bulkActions?.map((action) => (
                <Button
                  key={action.value}
                  size="sm"
                  onClick={() => handleBulkActionSelect(action.value)}
                  className={
                    action.destructive
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-300 shadow-sm"
                      : "bg-white/90 hover:bg-white text-violet-700 hover:text-violet-800 border border-violet-300 shadow-sm"
                  }
                >
                  <Icon name={action.icon} size={14} className="mr-1.5" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters grid — same controls, tighter spacing in its own zone. */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 ${isExpanded ? "" : "hidden lg:grid"}`}
      >
        <Input
          type="search"
          placeholder="Search leads..."
          value={filters?.search || ""}
          onChange={(e) => handleFilterChange("search", e?.target?.value)}
          className="lg:col-span-2"
        />

        <Select
          placeholder="Status"
          options={statusOptions}
          // Multi-select — rep can pick more than one status (e.g.
          // Interested + Follow up) without losing the other one.
          // Normalize legacy string-shaped persisted value into an
          // array at render time so older saved tabState still works.
          multiple
          searchable
          clearable
          value={
            Array.isArray(filters?.status)
              ? filters.status
              : filters?.status
                ? [filters.status]
                : []
          }
          onChange={(value) => handleFilterChange("status", value || [])}
        />

        <Input
          placeholder="Project Name"
          value={filters?.cProject || ""}
          onChange={(e) => handleFilterChange("cProject", e.target.value)}
        />

        <Select
          placeholder="Source"
          options={sourceOptions}
          value={filters?.source || ""}
          onChange={(value) => handleFilterChange("source", value)}
        />
        <Select
          placeholder="Assign User"
          options={assignUserOptions}
          value={filters?.assignUser || ""}
          onChange={(value) => handleFilterChange("assignUser", value)}
          searchable
        />
        <Select
          placeholder="Team"
          options={teamOptions}
          value={filters?.team || ""}
          onChange={(value) => handleFilterChange("team", value)}
          searchable
          clearable
          // Allow long team names to wrap in the dropdown list, give the
          // panel a touch more breathing room, and surface the full name on
          // hover (the trigger stays clean via the existing truncate).
          wrapOptions
          dropdownClassName="min-w-[260px]"
        />
        {/* Date Type Select */}
        <Select
          className="min-w-0"
          placeholder="Filter by date"
          options={ACTIVITY_DATE_FILTERS}
          value={filters?.dateType || ""}
          onChange={(value) => handleFilterChange("dateType", value)}
        />


        {/* Next Contact filter — same option list as Filter by date, but
            applied to `cNextContact` on the backend instead of `createdAt`.
            Independent filter keys (nextContactType / nextContactFrom /
            nextContactTo / nextContactXDays) let both filters coexist. */}
        <Select
          className="min-w-0"
          placeholder="Next Contact"
          options={ACTIVITY_DATE_FILTERS}
          value={filters?.nextContactType || ""}
          onChange={(value) => handleFilterChange("nextContactType", value)}
        />

        {/* Lead Analytics — pinned to the rightmost grid column in single-input
            date modes (Specific Day / Before / After) so it sits at the far
            right instead of right next to the date input. Date Range already
            fills cols 3-4 so the button auto-flows to col 5; no-date-filter
            mode keeps col-span-3 so the button stays right-aligned across its
            wider cell. */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-end ${!showDateInputs
          ? "lg:col-span-2"
          : filters?.dateType === "between"
            ? "lg:col-span-1"
            : "lg:col-start-5 lg:col-span-1"
          }`}>
          <Button onClick={toggleAnalytics} className="linearbg-1 text-white hover:text-white">
            <Icon name="Plus" size={16} className="mr-2" />
            Lead Analytics
          </Button>
        </div>
      </div>

      {/* Date conditional grids — sit inside the card directly under
          the filter grid. The outer wrapper no longer has padding, so
          these get their own `px-4 pb-4` to stay aligned. */}
      {showDateConditional && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 px-4 pb-4">
          {renderDateConditional({
            type: filters?.dateType,
            fromKey: "closeDateFrom",
            toKey: "closeDateTo",
            xDaysKey: "xDays",
            maxToday: true,
          })}
        </div>
      )}
      {showNextContactConditional && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 px-4 pb-4">
          {renderDateConditional({
            type: filters?.nextContactType,
            fromKey: "nextContactFrom",
            toKey: "nextContactTo",
            xDaysKey: "nextContactXDays",
            maxToday: false,
          })}
        </div>
      )}

    </div>
  );
};

export default DealsFilters;
