import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import RoleGuard from "components/RoleGuard";
import { todayLocal } from "../../../utils/dateFilter";

const FilterControls = ({
  filters,
  onFiltersChange,
  onClearFilters,
  dealCount,
  selectedCount,
  toggleAnalytics,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [assignUser, setAssignUser] = useState([]);

  const daysOptions = [
    { label: "Today", value: "today" },
    // 🔥 we keep yesterday in UI but handle it smartly
    { label: "Last 7 Days", value: "lastSevenDays" },
    { label: "Current Month", value: "currentMonth" },
    { label: "Last Month", value: "lastMonth" },
    { label: "On", value: "on" },
    { label: "Before", value: "before" },
    { label: "After", value: "after" },
    { label: "Between", value: "between" },
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  useEffect(() => {
    fetchUser()
      .then((res) => setAssignUser(res.list || []))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  const showDateInputs = [
    "between",
    "after",
    "before",
    "on"
  ].includes(filters?.dateType);

  const activeFiltersCount = Object.values(filters)?.filter((value) => {
    if (value === "" || value === null || value === undefined) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  })?.length;
  const assignUserOptions = assignUser.map((acc) => ({
    value: acc.id, // 👈 important (ID use karo)
    label: acc.name,
  }));
  const sourceOptions = [
    { value: "Call", label: "Call" },
    { value: "Email", label: "Email" },
    { value: "Existing Customer", label: "Existing Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Public Relations", label: "Public Relations" },
    { value: "Web Site", label: "Web Site" },
    { value: "Campaign", label: "Campaign" },
    { value: "Other", label: "Other" },
    { value: "ACL", label: "Aajneeti" },
  ];
  const statusOptions = [
    { value: "Broker", label: "Broker" },
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

  // Active filter pills — one per applied filter. Each pill has its
  // own onRemove closure so removing one doesn't disturb the others.
  // Date pill clears dateType + closeDateFrom + closeDateTo together
  // so the form never ends up with orphan dates and no date type.
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
    if (filters?.status) {
      const m = statusOptions.find((o) => o.value === filters.status);
      pills.push({
        key: "status",
        label: "Status",
        value: m?.label || filters.status,
        onRemove: () => handleFilterChange("status", ""),
      });
    }
    if (filters?.source) {
      const m = sourceOptions.find((o) => o.value === filters.source);
      pills.push({
        key: "source",
        label: "Source",
        value: m?.label || filters.source,
        onRemove: () => handleFilterChange("source", ""),
      });
    }
    if (filters?.assignUser) {
      const m = assignUserOptions.find((o) => o.value === filters.assignUser);
      pills.push({
        key: "assignUser",
        label: "Assigned",
        value: m?.label || filters.assignUser,
        onRemove: () => handleFilterChange("assignUser", ""),
      });
    }
    if (filters?.dateType) {
      const m = daysOptions.find((o) => o.value === filters.dateType);
      let display = m?.label || filters.dateType;
      if (
        filters.closeDateFrom &&
        filters.closeDateTo &&
        filters.dateType === "between"
      ) {
        display = `${filters.closeDateFrom} → ${filters.closeDateTo}`;
      } else if (filters.closeDateFrom) {
        display = `${display}: ${filters.closeDateFrom}`;
      }
      pills.push({
        key: "dateType",
        label: "Date",
        value: display,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            dateType: "",
            closeDateFrom: "",
            closeDateTo: "",
          }),
      });
    }
    return pills;
  })();

  // No `overflow-hidden` on the wrapper — that was clipping the Select
  // dropdown panels. Header strip below gets its own `rounded-t-xl` so
  // the tinted gradient still hugs the outer card's rounded top corners.
  // Reports doesn't have bulk update / delete actions wired (the
  // selection toolbar from other modules is omitted); a small selected-
  // count badge inside the header gives the rep feedback instead.
  return (
    <div className="bg-card border border-border rounded-xl mb-6 shadow-sm">
      {/* Header strip — soft slate gradient + BarChart icon + count.
          Active filter pills wrap inline so even many pills don't
          break the layout. */}
      <div className="px-5 py-3 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-transparent border-b border-border rounded-t-xl">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex items-start gap-3 flex-wrap flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon name="BarChart3" size={14} className="text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">
                Leads
                <span className="ml-1.5 text-sm font-medium text-muted-foreground tabular-nums">
                  ({dealCount?.toLocaleString?.() ?? dealCount})
                </span>
              </h2>
            </div>
            {/* Active filter pills — one per applied filter. Each pill
                has an X that removes that specific filter without
                touching the others. */}
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

          <div className="flex items-center gap-2 shrink-0">
            {/* Selection count badge — reports has no bulk-update / mass
                delete flow, so this is a feedback chip only (no action
                buttons). Soft violet matches the "selection mode" tone
                used in deals/meeting/tasks toolbars. */}
            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100/80 text-violet-700 text-xs font-medium rounded-full border border-violet-200/60">
                <Icon name="CheckCircle2" size={12} />
                {selectedCount} selected
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="lg:hidden w-full"
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
      </div>

      {/* Filters grid — same controls, tighter spacing in its own zone. */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 ${isExpanded ? "block" : "hidden lg:grid"}`}
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
          value={filters?.status || ""}
          onChange={(value) => handleFilterChange("status", value)}
        />

        <Select
          placeholder="Filter By Days"
          options={daysOptions}
          value={filters?.dateType || ""}
          onChange={(value) => handleFilterChange("dateType", value)}
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
      </div>

      {/* Date conditional + Report Analytics — sits below the filter
          grid inside the card. Uses px-4 pb-4 to align with the new
          padding-less wrapper. */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-4 pb-4 border-t border-border pt-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {showDateInputs && (
            <div className="flex gap-2">
              <Input
                type="date"
                max={todayLocal()}
                value={filters?.closeDateFrom || ""}
                onChange={(e) =>
                  handleFilterChange("closeDateFrom", e.target.value)
                }
              />
              {filters?.dateType === "between" && (
                <Input
                  type="date"
                  max={todayLocal()}
                  min={filters?.closeDateFrom || undefined}
                  value={filters?.closeDateTo || ""}
                  onChange={(e) =>
                    handleFilterChange("closeDateTo", e.target.value)
                  }
                />
              )}
            </div>
          )}
        </div>
        <RoleGuard allowedRoles={["admin", "regular"]}>
          <Button onClick={toggleAnalytics} className="linearbg-1 text-white hover:text-white">Report Analytics</Button>
        </RoleGuard>
      </div>
    </div>
  );
};

export default FilterControls;
