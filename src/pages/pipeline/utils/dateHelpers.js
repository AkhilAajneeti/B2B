/**
 * Date utilities for the pipeline module.
 *
 * EspoCRM serialises date-times as "YYYY-MM-DD HH:mm:ss" in UTC and plain
 * dates as "YYYY-MM-DD". Every parse goes through `parseEspoDate` so the rest
 * of the module never has to think about that format again.
 */
import {
  differenceInCalendarDays,
  isValid,
  addDays as addDaysFn,
} from "date-fns";

/**
 * Parse an EspoCRM date / date-time string into a Date (or null).
 *
 * Note: ESPO transports date-times as "YYYY-MM-DD HH:mm:ss" without a tz
 * suffix. The rest of this CRM (see leads.service callers, DealCard, etc.)
 * treats those strings as LOCAL wall-clock time, not UTC - that matches what
 * users actually type in their timezone. We follow the same convention so a
 * follow-up entered as "25 May" never displays as "26 May" in UI later.
 */
export const parseEspoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const date =
      trimmed.length <= 10
        ? new Date(`${trimmed}T00:00:00`) // plain date -> local midnight
        : new Date(trimmed.replace(" ", "T")); // datetime -> local wall-clock

    return isValid(date) ? date : null;
  }

  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
};

/** Calendar days from today -> positive = future, negative = past. */
export const daysFromToday = (value) => {
  const date = parseEspoDate(value);
  if (!date) return null;
  return differenceInCalendarDays(date, new Date());
};

/** Calendar days since the given date -> positive = in the past. */
export const daysSince = (value) => {
  const date = parseEspoDate(value);
  if (!date) return null;
  return differenceInCalendarDays(new Date(), date);
};

/**
 * Smart relative label for a follow-up date.
 * e.g. "Today", "Tomorrow", "In 2 Days", "3 Days Overdue".
 */
export const getRelativeDateLabel = (value) => {
  const diff = daysFromToday(value);
  if (diff === null) return "No follow-up";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "1 Day Overdue";
  if (diff > 1) return `In ${diff} Days`;
  return `${Math.abs(diff)} Days Overdue`;
};

/** Relative label for the last activity / modified date. */
export const getLastActivityLabel = (value) => {
  const diff = daysSince(value);
  if (diff === null) return "No activity";
  if (diff <= 0) return "Active today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
};

/** Compact, human-readable date -> "12 May 2026". */
export const formatShortDate = (value) => {
  const date = parseEspoDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Serialise a Date back into the EspoCRM date-time format (noon, UTC-safe). */
export const toEspoDateTime = (date) => {
  const d = date instanceof Date ? date : parseEspoDate(date) || new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` 12:00:00`
  );
};

/** date-fns addDays re-exported so callers only import from one place. */
export const addDays = addDaysFn;
