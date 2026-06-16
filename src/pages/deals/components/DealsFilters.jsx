import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import RoleGuard from "components/RoleGuard";
import { useTeams } from "hooks/useTeams";
import { todayLocal } from "../../../utils/dateFilter";

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

  const bulkActions = [
    { value: "mass-update", label: "Mass Update", icon: "GitBranch" },
    // { value: "export", label: "Export Selected", icon: "Download" },
    // { value: "delete", label: "Delete Selected", icon: "Trash2" },
  ];


  const sourceOptions = [
    { value: "Call", label: "Call" },
    { value: "Email", label: "Email" },
    { value: "Existing Customer", label: "Existing Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Public Relations", label: "Public Relations" },
    // value must match the actual cSubSource string stored on leads (matched
    // case-insensitively as a `like %value%` on the backend). "Web Site" keeps
    // its space; "Aajneeti" replaces the old "ACL" code so it matches the
    // stored "aajneeti".
    { value: "Web Site", label: "Web Site" },
    { value: "Campaign", label: "Campaign" },
    { value: "Aajneeti", label: "Aajneeti" },
    { value: "Meta", label: "Meta" },
    { value: "Other", label: "Other" },
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

  // Renders the conditional inputs (X Days + Date Range) that appear when
  // a date-mode filter is set. Used for both `dateType` (createdAt-based)
  // and `nextContactType` (cNextContact-based) so we don't repeat the
  // ~50-line block twice.
  //
  // Params:
  //   type          - the currently picked filter type (e.g. "between")
  //   fromKey/toKey - state keys for the From/To dates
  //   xDaysKey      - state key for the "Enter days" input
  //   maxToday      - when true, both pickers cap at today (useful for
  //                   activity-date filters where future dates make no
  //                   sense; nextContact pickers leave this off so the
  //                   rep can pick a future follow-up date).
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

  const activeFiltersCount = Object.values(filters)?.filter(
    (value) => value !== "" && value !== null && value !== undefined,
  )?.length;
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
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-foreground">
            Leads ({total})
          </h2>
          {activeFiltersCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""}{" "}
                active
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  <Icon name="MoreHorizontal" size={16} className="mr-1" />
                  Actions
                </Button>

                {showBulkActions && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowBulkActions(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-elevation-2 z-50">
                      <div className="py-1">
                        {bulkActions?.map((action) => (
                          <button
                            key={action?.value}
                            onClick={() =>
                              handleBulkActionSelect(action?.value)
                            }
                            className="flex items-center w-full px-3 py-2 text-sm text-popover-foreground hover:bg-muted transition-smooth"
                          >
                            <Icon
                              name={action?.icon}
                              size={16}
                              className="mr-2"
                            />
                            {action?.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden w-full"
          >
            <Icon name="Filter" size={16} className="mr-1" />
            Filters
            <Icon
              name="ChevronDown"
              size={16}
              className={`ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </Button>
        </div>
      </div>
      {/* Filters */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${isExpanded ? "" : "hidden lg:grid"}`}
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

      {showDateConditional && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
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
