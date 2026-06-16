/**
 * Import page
 *
 * Thin composer — manages the page-level state (filters, pagination, sort,
 * row selection, drawer open/close) and delegates rendering to the
 * components in ./components.
 *
 * Permissions: gated by the sidebar entry (admin/manager/owner). The page
 * itself trusts the route — no additional ACL check here.
 *
 * Layout:
 *   <Header />
 *   <Sidebar />
 *   <main>
 *     Title strip with "New Import" button
 *     <ImportFilters />     ← search / status / entity type / date
 *     <ImportTable />       ← desktop table + mobile cards
 *     <TablePagination />
 *   </main>
 *   <ImportDrawer />        ← right-side slider, 3 steps
 */

import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "components/ui/Header";
import Sidebar from "components/ui/Sidebar";
import Button from "components/ui/Button";
import Icon from "components/AppIcon";
import { fetchImports } from "./components/utils";
import ImportFilters from "./components/ImportFilters";
import ImportTable from "./components/ImportTable";
import TablePagination from "./components/TablePagination";
import ImportDrawer from "./components/ImportDrawer";

const FILTERS_INITIAL = {
  search: "",
  status: "",
  entityType: "",
  dateType: "",
  closeDateFrom: "",
  closeDateTo: "",
};

const ImportPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState(FILTERS_INITIAL);
  const [orderBy, setOrderBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // React Query — keeps a 2-minute fresh window per (limit, page, filters,
  // order) combo and de-dupes concurrent identical requests for us.
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["imports", limit, page, filters, orderBy, order],
    queryFn: () => fetchImports({ limit, page, filters, orderBy, order }),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const rows = data?.list || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Reset to page 1 whenever a filter changes (otherwise you can end up on
  // page 5 of a result set that only has 1 page).
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [filters, limit]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (v) => v !== "" && v !== null && v !== undefined,
      ).length,
    [filters],
  );

  // ---------- Handlers ----------

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset dependent fields when dateType changes — same convention as
      // DealsFilters.
      if (key === "dateType") {
        next.closeDateFrom = "";
        next.closeDateTo = "";
      }
      return next;
    });
  };

  const handleClearFilters = () => setFilters(FILTERS_INITIAL);

  const handleSort = (column) => {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("desc");
    }
  };

  const toggleRow = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = (checked) =>
    setSelectedIds(checked ? rows.map((r) => r.id) : []);

  const isAllSelected = rows.length > 0 && selectedIds.length === rows.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < rows.length;

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-background">
      <Header
        onMenuToggle={() => setIsSidebarOpen((v) => !v)}
        isSidebarOpen={isSidebarOpen}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="lg:ml-64 pt-16">
        <div className="p-6">
          {/* Page header */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Imports
              </h1>
              <p className="text-muted-foreground">
                Track CSV imports across entities, monitor status, and start
                new bulk uploads.
              </p>
            </div>
            <Button
              onClick={() => setDrawerOpen(true)}
              className="linearbg-1 text-white hover:text-white shrink-0"
            >
              <Icon name="Plus" size={16} className="mr-2" />
              New Import
            </Button>
          </div>

          <ImportFilters
            filters={filters}
            total={total}
            activeFilterCount={activeFilterCount}
            isFetching={isFetching}
            onChange={handleFilterChange}
            onClearAll={handleClearFilters}
            onRefresh={refetch}
          />

          <ImportTable
            rows={rows}
            isLoading={isLoading}
            selectedIds={selectedIds}
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
          />

          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </div>
      </main>

      {/* Right-side drawer (3-step New Import flow). Closing it via X /
          backdrop / Close button just flips this flag — the drawer itself
          handles resetting its internal state on the next open. On a
          successful import we refetch the imports table so the new row
          appears behind the drawer when it closes. */}
      <ImportDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
};

export default ImportPage;
