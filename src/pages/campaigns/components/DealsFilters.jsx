import React, { useEffect, useState } from "react";
import { isAdminOrManager, isMaskedUser } from "../../../utils/permission.js";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { fetchUser } from "services/user.service";
import { todayLocal } from "../../../utils/dateFilter";

const DealsFilters = ({
  filters,
  onFiltersChange,
  onClearFilters,
  dealCount,
  onBulkAction,
  selectedCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [assignUser, setAssignUser] = useState([]);

  const isAdminManager = isAdminOrManager();
  const bulkActions = [
    { value: "massupdate", label: "Mass Update", icon: "Update" },
    // { value: "export", label: "Export Selected", icon: "Download" },
    ...(isAdminManager ? [{ value: "delete", label: "Delete Selected", icon: "Trash2" }] : []),
  ];
  const ACTIVITY_DATE_FILTERS = [
    { label: "Today", value: "today" },
    { label: "Last 7 Days", value: "lastSevenDays" },
    { label: "Current Month", value: "currentMonth" },
    { label: "Last Month", value: "lastMonth" },
    // special
    { label: "On", value: "on" },
    { label: "Before", value: "before" },
    { label: "After", value: "after" },
    // { label: "After X Days", value: "afterXDays" },
  ];
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };
  const showDateInputs = ["on", "before", "after"].includes(filters?.dateType);
  const handleBulkActionSelect = (action) => {
    onBulkAction(action);
    setShowBulkActions(false);
  };
  useEffect(() => {
    fetchUser()
      .then((res) => setAssignUser(res.list || []))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  const activeFiltersCount = Object.values(filters)?.filter((value) => {
    if (value === "" || value === null || value === undefined) return false;
    // Empty arrays (multi-select with nothing picked) should NOT count
    // as active filters — they're truthy in JS but represent "no
    // filter applied".
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  })?.length;
  const assignUserOptions = assignUser.map((acc) => ({
    value: acc.id, // 👈 important (ID use karo)
    label: acc.name,
  }));
  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Header Row.
          Centred on a phone, left-aligned from lg: the count and the filter
          toggle are the only things in the card there, and left-aligning a
          lone short heading in a full-width card leaves it adrift. */}
      <div className="mb-4 flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:items-center lg:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:space-x-4 lg:items-center">
          <h2 className="text-lg font-semibold text-foreground">
            Projects ({dealCount?.toLocaleString()})
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

        <div className="flex w-full items-center justify-center gap-2 lg:w-auto lg:justify-end">
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
            className="w-full justify-center rounded-full border-border px-5 sm:w-auto lg:hidden"
          >
            <Icon name="Filter" size={16} className="mr-1.5" />
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
          placeholder="Search by project name…"
          value={filters?.search || ""}
          onChange={(e) => handleFilterChange("search", e?.target?.value)}
          className="lg:col-span-2"
        />

        {/* Assign User — withheld from restricted accounts, matching the
            leads page filter of the same name and the hidden Lead
            Distribution / Teams tabs in this page's own drawer. */}
        {!isMaskedUser() && (
          <Select
            placeholder="Assign User"
            options={assignUserOptions}
            value={filters?.assignUser || ""}
            onChange={(value) => handleFilterChange("assignUser", value)}
            searchable
          />
        )}


        <Select
          className="min-w-0"
          placeholder="Filter by date"
          options={ACTIVITY_DATE_FILTERS}
          value={filters?.dateType || ""}
          onChange={(value) => handleFilterChange("dateType", value)}
        />

        {/* Date Range Inputs */}
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
        {/* <Button variant="outline" size="sm" className="linearbg-1 text-white hover:text-white" >
          <Icon name="Download" size={16} className="mr-1" />
          Export All
        </Button> */}
      </div>
    </div>
  );
};

export default DealsFilters;
