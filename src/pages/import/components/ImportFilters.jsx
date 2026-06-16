/**
 * ImportFilters
 *
 * Filter card above the imports table — search, status, entity type, date.
 * Pure presentational: receives `filters` + `onChange(key, value)` from the
 * page, owns no state of its own. Date-mode conditional inputs (Specific Day,
 * Date Range) appear inline next to the Filter-by-date select.
 */

import React from "react";
import Button from "components/ui/Button";
import Input from "components/ui/Input";
import Select from "components/ui/Select";
import Icon from "components/AppIcon";
import {
  STATUS_OPTIONS,
  ENTITY_TYPE_OPTIONS,
  DATE_OPTIONS,
} from "./constants";

const ImportFilters = ({
  filters,
  total,
  activeFilterCount,
  isFetching,
  onChange,
  onClearAll,
  onRefresh,
}) => {
  const showSpecificDateInput = ["on", "before", "after"].includes(
    filters?.dateType,
  );
  const showRangeInputs = filters?.dateType === "between";

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Imports ({total.toLocaleString()})
          </h2>
          {activeFilterCount > 0 && (
            <>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {activeFilterCount} filter
                {activeFilterCount !== 1 ? "s" : ""} active
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="text-xs"
              >
                Clear all
              </Button>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
        >
          <Icon
            name="RefreshCw"
            size={14}
            className={`mr-1 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filter grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Input
          type="search"
          placeholder="Search entity type..."
          value={filters.search}
          onChange={(e) => onChange("search", e.target.value)}
          className="lg:col-span-2"
        />
        <Select
          placeholder="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(v) => onChange("status", v)}
          clearable
        />
        <Select
          placeholder="Entity Type"
          options={ENTITY_TYPE_OPTIONS}
          value={filters.entityType}
          onChange={(v) => onChange("entityType", v)}
          clearable
        />
        <Select
          placeholder="Filter by date"
          options={DATE_OPTIONS}
          value={filters.dateType}
          onChange={(v) => onChange("dateType", v)}
          clearable
        />
        {showSpecificDateInput && (
          <Input
            type="date"
            value={filters.closeDateFrom}
            onChange={(e) => onChange("closeDateFrom", e.target.value)}
          />
        )}
        {showRangeInputs && (
          <div className="flex gap-2 lg:col-span-2">
            <div className="flex-1 min-w-0">
              <Input
                type="date"
                label="From"
                value={filters.closeDateFrom}
                onChange={(e) => onChange("closeDateFrom", e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Input
                type="date"
                label="To"
                min={filters.closeDateFrom || undefined}
                value={filters.closeDateTo}
                onChange={(e) => onChange("closeDateTo", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportFilters;
