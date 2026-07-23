/**
 * TablePagination
 *
 * Footer strip for the imports table: "Showing X to Y of Z results",
 * per-page selector (10/25/50/100), and Previous / Next controls. Pure
 * presentational — the page owns `page` / `limit` state and passes the
 * callbacks in.
 */

import React from "react";
import Button from "components/ui/Button";
import Select from "components/ui/Select";
import Icon from "components/AppIcon";
import { PAGE_SIZE_OPTIONS } from "./constants";

const TablePagination = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}) => {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-card border-t border-border">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {start.toLocaleString()} to {end.toLocaleString()} of{" "}
          {total.toLocaleString()} results
        </div>
        <Select
          options={PAGE_SIZE_OPTIONS}
          value={limit.toString()}
          onChange={(v) => onLimitChange(parseInt(v, 10))}
          className="w-32"
        />
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <Icon name="ChevronLeft" size={16} className="mr-1" />
          Previous
        </Button>
        <span className="px-3 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
          <Icon name="ChevronRight" size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
