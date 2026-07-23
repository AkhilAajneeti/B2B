/**
 * Import module — shared helpers.
 *
 * Pure functions only (no React, no DOM access aside from localStorage in
 * fetchImports). Everything that touches the network or formats data for
 * the table/drawer lives here so components stay focused on layout.
 */

import { API_BASE, FIELD_OPTIONS, LEAD_STATUS_PILL } from "./constants";

// ---------------------------------------------------------------------------
// Date helpers — EspoCRM datetimes are UTC strings ("YYYY-MM-DD HH:mm:ss").
// Append Z so JS parses correctly and downstream `Date` methods operate in
// the user's local timezone, which is what we want for display.
// ---------------------------------------------------------------------------

export const parseEspoDate = (raw) => {
  if (!raw) return null;
  const iso = raw.length <= 10
    ? `${raw}T12:00:00Z`
    : `${raw.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// "Today 15:02" for today, "20 Dec, 2025 18:09" otherwise. Used in the main
// imports table.
export const formatCreatedAt = (raw) => {
  const d = parseEspoDate(raw);
  if (!d) return "—";
  const now = new Date();
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isSameDay(d, now)) return `Today ${time}`;
  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${datePart} ${time}`;
};

// "Today 15:02" / "Tomorrow 15:02" / "20 Dec, 2025 15:02". Used in the
// overview tables (where tomorrow is a common next-contact value).
export const formatShortDateTime = (raw) => {
  const d = parseEspoDate(raw);
  if (!d) return "—";
  const now = new Date();
  const time = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  if (isSameDay(d, now)) return `Today ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} ${time}`;
};

// ---------------------------------------------------------------------------
// Status pill colors
// ---------------------------------------------------------------------------

// Import-record statuses on the main table.
export const getStatusBadge = (status) => {
  const styles = {
    Complete: "bg-green-50 text-green-700 border border-green-200",
    "In Progress": "bg-blue-50 text-blue-700 border border-blue-200",
    Failed: "bg-red-50 text-red-700 border border-red-200",
    Standby: "bg-amber-50 text-amber-700 border border-amber-200",
  };
  return styles[status] || "bg-gray-100 text-gray-700 border border-gray-200";
};

// Per-lead statuses inside the overview's Imported / Duplicates tables.
export const leadStatusClass = (s) =>
  LEAD_STATUS_PILL[s] || "bg-gray-100 text-gray-700";

// ---------------------------------------------------------------------------
// CSV header → EspoCRM field matcher
// ---------------------------------------------------------------------------

// Lowercase + strip non-alphanumerics for fuzzy header matching.
// "First Name", "first_name", "firstName" all collapse to "firstname".
const normalizeForMatch = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Find a FIELD_OPTIONS entry whose label OR value normalizes to the same
// shape as the CSV header. Returns "" (the -Skip- value) when no hit so the
// rep can pick manually.
export const guessFieldForHeader = (csvHeader) => {
  const target = normalizeForMatch(csvHeader);
  if (!target) return "";
  const hit = FIELD_OPTIONS.find(
    (opt) =>
      normalizeForMatch(opt.label) === target ||
      normalizeForMatch(opt.value) === target,
  );
  return hit ? hit.value : "";
};

// ---------------------------------------------------------------------------
// Query string builder + fetch for the main imports table
// ---------------------------------------------------------------------------

export const buildWhereQuery = (filters = {}) => {
  const where = [];

  if (filters.search?.trim()) {
    where.push({
      type: "like",
      attribute: "entityType",
      value: `%${filters.search.trim()}%`,
    });
  }
  if (filters.status) {
    where.push({ type: "equals", attribute: "status", value: filters.status });
  }
  if (filters.entityType) {
    where.push({
      type: "equals",
      attribute: "entityType",
      value: filters.entityType,
    });
  }
  if (filters.dateType) {
    const t = filters.dateType;
    if (["on", "before", "after"].includes(t)) {
      if (filters.closeDateFrom) {
        where.push({
          type: t,
          attribute: "createdAt",
          value: filters.closeDateFrom,
          dateTime: true,
        });
      }
    } else if (t === "between") {
      if (filters.closeDateFrom && filters.closeDateTo) {
        where.push({
          type: t,
          attribute: "createdAt",
          value: [filters.closeDateFrom, filters.closeDateTo],
          dateTime: true,
        });
      }
    } else {
      where.push({ type: t, attribute: "createdAt", dateTime: true });
    }
  }

  return where
    .map((c, i) => {
      const parts = [`whereGroup[${i}][type]=${c.type}`];
      if (c.attribute) parts.push(`whereGroup[${i}][attribute]=${c.attribute}`);
      if (c.value !== undefined) {
        if (Array.isArray(c.value)) {
          c.value.forEach((v) =>
            parts.push(`whereGroup[${i}][value][]=${encodeURIComponent(v)}`),
          );
        } else {
          parts.push(`whereGroup[${i}][value]=${encodeURIComponent(c.value)}`);
        }
      }
      if (c.dateTime) parts.push(`whereGroup[${i}][dateTime]=true`);
      return parts.join("&");
    })
    .join("&");
};

export const fetchImports = async ({
  limit,
  page,
  filters,
  orderBy,
  order,
}) => {
  const token = localStorage.getItem("auth_token");
  const offset = (page - 1) * limit;
  const query = buildWhereQuery(filters);
  const url = `${API_BASE}/Import?maxSize=${limit}&offset=${offset}&orderBy=${orderBy}&order=${order}${query ? `&${query}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", token },
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch imports");
  }
  return res.json();
};
