import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import { isSupAdmin } from "utils/permission";

const DealsFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  dealCount,
  onBulkAction,
  selectedCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [assignUser, setAssignUser] = useState([]);
  // const [status, setStatus] = useState([]);


  // 
  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       const [statusRes] = await Promise.all([
  //         fetchStatus(),
  //       ]);

  //       setStatus(statusRes.options || []);
  //     } catch (err) {
  //       console.error("Failed to load data", err);
  //     }
  //   };

  //   loadData();
  // }, []);
  // const statusOptions = status
  //   .filter((item) => item !== "")
  //   .map((item) => ({
  //     value: item,
  //     label: item,
  //   }));
  const statusOptions = [
    { value: "Not Started", label: "Not Started" },
    { value: "Started", label: "Started" },
    { value: "Completed", label: "Completed" },
    { value: "Canceled", label: "Canceled" },
    { value: "Deferred", label: "Deferred" },
  ];
  const priorityOptions = [
    { value: "", label: "All Status" },
    { value: "Low", label: "Low" },
    { value: "Normal", label: "Normal" },
    { value: "High", label: "High" },
    { value: "Urgent", label: "Urgent" },
  ];
  // Delete action is destructive and irreversible — admin-only. The
  // `isSupAdmin()` check returns true only when user.type === "admin"
  // (owners/managers don't qualify). Builds the list conditionally so
  // non-admins never see the Delete button at all.
  const bulkActions = [
    { value: "massupdate", label: "Mass Update", icon: "Update" },
    ...(isSupAdmin()
      ? [{ value: "delete", label: "Delete Selected", icon: "Trash2", destructive: true }]
      : []),
  ];

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleBulkActionSelect = (action) => {
    onBulkAction(action);
  };
  useEffect(() => {
    fetchUser()
      .then((res) => setAssignUser(res.list || []))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  const ACTIVITY_DATE_FILTERS = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 Days", value: "last7Days" },

    { label: "Before", value: "before" },
    { label: "After", value: "after" },

    { label: "Between", value: "between" },
    { label: "This Month", value: "currentMonth" },
    { label: "Last Month", value: "lastMonth" },
  ];
  const showDateInputs = ["between", "after", "before"].includes(filters?.dateType);
  const activeFiltersCount = Object.values(filters)?.filter(
    (value) => value !== "" && value !== null && value !== undefined,
  )?.length;
  const assignUserOptions = assignUser.map((acc) => ({
    value: acc.id, // 👈 important (ID use karo)
    label: acc.name,
  }));
  // No `overflow-hidden` on the wrapper — that was clipping the
  // Select dropdown panels when they opened past the card's bottom.
  // Header strip below gets its own `rounded-t-xl` so the tinted
  // gradient still hugs the outer card's rounded top corners.
  return (
    <div className="bg-card border border-border rounded-xl mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-slate-50/80 via-slate-50/30 to-transparent border-b border-border rounded-t-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon name="ListChecks" size={14} className="text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Tasks
              <span className="ml-1.5 text-sm font-medium text-muted-foreground tabular-nums">
                ({dealCount?.toLocaleString?.() ?? dealCount})
              </span>
            </h2>
          </div>
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                <Icon name="Sparkles" size={10} />
                {activeFiltersCount} active
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden"
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

      {/* Selection toolbar — slides in when checkboxes are selected.
          Soft pastel violet→fuchsia→pink so it reads as "active mode"
          without neon saturation. Dark violet text + ring accents keep
          enough contrast against the light background. Destructive
          actions get a rose treatment; everything else uses a neutral
          white-on-violet pill so reps don't fire delete by accident. */}
      {selectedCount > 0 && (
        <div className="relative px-5 py-3 bg-gradient-to-r from-violet-100/80 via-fuchsia-100/70 to-pink-100/80 border-y border-violet-200/60">
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/80 ring-1 ring-violet-200 flex items-center justify-center text-violet-600">
                <Icon name="CheckCircle2" size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight text-violet-900">
                  {selectedCount} task{selectedCount !== 1 ? "s" : ""} selected
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

      {/* Filters grid — same controls, slightly tighter spacing
          (gap-3 vs gap-4) so the card feels less chunky. */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 ${isExpanded ? "block" : "hidden lg:grid"}`}
      >
        <Input
          type="search"
          placeholder="Search Task..."
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
          placeholder="Priority"
          options={priorityOptions}
          value={filters?.priority || ""}
          onChange={(value) => handleFilterChange("priority", value)}
        />

        <Select
          placeholder="Assign User"
          options={assignUserOptions}
          value={filters?.assignUser || ""}
          onChange={(value) => handleFilterChange("assignUser", value)}
          searchable
        />
        <Select
          options={ACTIVITY_DATE_FILTERS}
          value={filters?.dateType || ""}
          onChange={(value) =>
            handleFilterChange("dateType", value)}
          placeholder="Filter by date"
          className="min-w-0"
        />
        {/* Date Range Inputs */}
        {showDateInputs && (
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters?.startDate || ""}
              onChange={(e) =>
                handleFilterChange("startDate", e.target.value)
              }
            />

            {filters?.dateType === "between" && (
              <Input
                type="date"
                value={filters?.endDate || ""}
                onChange={(e) =>
                  handleFilterChange("endDate", e.target.value)
                }
              />
            )}
          </div>
        )}
      </div>
      {/* Advanced Filters Toggle */}
      {/* <div className="hidden lg:flex items-center justify-between mt-4 pt-4 border-t border-border">

        <Button variant="outline" size="sm">
          <Icon name="Download" size={16} className="mr-1" />
          Export All
        </Button>
      </div> */}
    </div>
  );
};

export default DealsFilters;
