import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import RoleGuard from "components/RoleGuard";
import { fetchSources, fetchStatus } from "services/others.service";

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
  const [status, setStatus] = useState([]);

  const [source, setSource] = useState([]);

  const bulkActions = [
    { value: "mass-update", label: "Mass Update", icon: "GitBranch" },
    { value: "export", label: "Export Selected", icon: "Download" },
    { value: "delete", label: "Delete Selected", icon: "Trash2" },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statusRes, sourceRes] = await Promise.all([
          fetchStatus(),
          fetchSources(),
        ]);

        setStatus(statusRes.options || []);
        setSource(sourceRes.options || []);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };

    loadData();
  }, []);
  const sourceOptions = source
    .filter((item) => item !== "")
    .map((item) => ({
      value: item,
      label: item,
    }));
  const statusOptions = status
    .filter((item) => item !== "")
    .map((item) => ({
      value: item,
      label: item,
    }));
     const ACTIVITY_DATE_FILTERS = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "lastSevenDays" },
    { label: "Current Month", value: "currentMonth" },
    { label: "Last Month", value: "lastMonth" },
    // { label: "Next Month", value: "nextMonth" },
    { label: "Current Quarter", value: "currentQuarter" },
    { label: "Last Quarter", value: "lastQuarter" },
    { label: "Current Year", value: "currentYear" },
    { label: "Last Year", value: "lastYear" },
    { label: "Past", value: "past" },
    { label: "Future", value: "future" },
    { label: "Ever", value: "ever" },
    { label: "Is Empty", value: "isEmpty" },

    // special
    { label: "On", value: "on" },
    { label: "Before", value: "before" },
    { label: "After", value: "after" },
    { label: "Between", value: "between" },
    { label: "Last X Days", value: "lastXDays" },
    // { label: "After X Days", value: "afterXDays" },
  ];
  const showDateInputs = ["on", "before", "after", "between"].includes(filters?.dateType);
  const showXDaysInput = ["lastXDays", "afterXDays"].includes(filters?.dateType);
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

    onFiltersChange(updated);
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
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${isExpanded ? "block" : "hidden lg:grid"}`}
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

        {/* <Input
          placeholder="Project Name"
          value={filters?.projectName || ""}
          onChange={(e) => handleFilterChange("projectName", e.target.value)}
        /> */}

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
        />
        {/* Date Type Select */}
        <Select
          className="min-w-0"
          placeholder="Filter by date"
          options={ACTIVITY_DATE_FILTERS}
          value={filters?.dateType || ""}
          onChange={(value) => handleFilterChange("dateType", value)}
        />

        {/* X Days Input */}
        {showXDaysInput && (
          <Input
            type="number"
            placeholder="Enter days"
            value={filters?.xDays || ""}
            onChange={(e) =>
              handleFilterChange("xDays", e.target.value)
            }
          />
        )}

        {/* Date Range Inputs */}
        {showDateInputs && (
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters?.closeDateFrom || ""}
              onChange={(e) =>
                handleFilterChange("closeDateFrom", e.target.value)
              }
            />

            {filters?.dateType === "between" && (
              <Input
                type="date"
                value={filters?.closeDateTo || ""}
                onChange={(e) =>
                  handleFilterChange("closeDateTo", e.target.value)
                }
              />
            )}
          </div>
        )}
      </div>
      {/* Advanced Filters Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-border gap-3">
        
        {/* <RoleGuard allowedRoles={["admin", "manager"]}>
          <Button onClick={toggleAnalytics} className="linearbg-1 text-white hover:text-white">
            <Icon name="Plus" size={16} className="mr-2" />
            Anaylze By Chart
          </Button>
        </RoleGuard> */}
      </div>
    </div>
  );
};

export default DealsFilters;
