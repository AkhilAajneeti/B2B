import React from "react";
import Select from "../../../components/ui/Select";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Icon from "../../../components/AppIcon";

const ActivityFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
}) => {
  const activityTypeOptions = [
    { value: "all", label: "All Types" },
    { value: "Account", label: "Account" },
    { value: "Task", label: "Task" },
    { value: "Call", label: "Call" },
    { value: "Meeting", label: "Meeting" },
    { value: "Update", label: "Update" },
    { value: "Assign", label: "Assign" },
  ];

  const hasActiveFilters = () => {
    return (
      filters?.type !== "all" ||
      filters?.dateFrom ||
      filters?.dateTo ||
      filters?.search
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Icon name="Filter" size={20} className="text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Filter Activities
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-4">
        {/* Search */}
        <div className="lg:col-span-1">
          <Input
            type="search"
            placeholder="Search activities..."
            value={filters?.search}
            onChange={(e) => onFilterChange("search", e?.target?.value)}
            className="w-full"
          />
        </div>
        {/* Activity Type */}
        <Select
          options={activityTypeOptions}
          value={filters?.type}
          onChange={(value) => onFilterChange("type", value)}
          placeholder="Activity Type"
        />
        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            // label="From Date"
            value={filters?.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e?.target?.value)} />

          <Input
            type="date"
            // label="To Date"
            value={filters?.dateTo}
            onChange={(e) => onFilterChange("dateTo", e?.target?.value)} />
        </div>
      </div>
      <div className="flex items-center space-x-4 mt-3">
        <span className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} activities
        </span>

        {hasActiveFilters() && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            iconName="X"
            iconPosition="left"
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActivityFilters;
