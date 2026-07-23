import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../../components/AppIcon";

// Per-insight presentation: title, accent (matches the StatTile that opened it),
// icon, and a warm empty-state line so "nothing today" reads as normal, not an
// error.
const CONFIG = {
  meetings: {
    title: "Today's Meetings",
    accent: "#3B82F6",
    icon: "Calendar",
    empty: "No meetings created or scheduled today yet.",
  },
  purchased: {
    title: "Purchased Today",
    accent: "#10B981",
    icon: "BadgeCheck",
    empty: "No purchases logged today yet.",
  },
  visits: {
    title: "Site Visits",
    accent: "#F59E0B",
    icon: "MapPin",
    empty: "No site visits completed today yet.",
  },
  siteVisitsScheduled: {
    title: "Site Visits Scheduled Today",
    accent: "#0EA5E9",
    icon: "CalendarCheck",
    empty: "No site visits booked today yet.",
  },
};

const hexToRgba = (hex = "#3B82F6", a = 1) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  // eslint-disable-next-line no-bitwise
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

// One labelled field inside a record card.
const Field = ({ label, children }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
      {label}
    </dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const InsightSheet = ({ activeInsight, data = [], onClose, formatDate, formatTime }) => {
  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!activeInsight) return undefined;
    const onKey = (e) => {
      if (e?.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [activeInsight, onClose]);

  const cfg = activeInsight ? CONFIG[activeInsight] : null;
  const isMeetings = activeInsight === "meetings";

  return (
    <AnimatePresence>
      {cfg && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={cfg.title}
            className="relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-[rgba(20,20,30,0.08)] bg-card shadow-[0_-8px_40px_-12px_rgba(16,24,40,0.25)] sm:max-w-2xl sm:rounded-2xl"
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Grab handle (mobile affordance) */}
            <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
              <span className="h-1 w-9 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: hexToRgba(cfg.accent, 0.12) }}
                >
                  <Icon name={cfg.icon} size={18} color={cfg.accent} />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-bold tracking-tight text-foreground">
                    {cfg.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {data.length} {data.length === 1 ? "record" : "records"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                  <span
                    className="grid h-14 w-14 place-items-center rounded-2xl"
                    style={{ backgroundColor: hexToRgba(cfg.accent, 0.1) }}
                  >
                    <Icon name={cfg.icon} size={26} color={cfg.accent} />
                  </span>
                  <p className="max-w-[16rem] text-sm text-muted-foreground">
                    {cfg.empty}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {data.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-[rgba(20,20,30,0.07)] bg-background/60 p-3.5"
                    >
                      <p className="font-semibold text-foreground">{item.name}</p>

                      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                        {isMeetings ? (
                          <>
                            <Field label="Start">{formatTime(item.dateStart)}</Field>
                            <Field label="End">{formatTime(item.dateEnd)}</Field>
                            <div className="col-span-2">
                              <Field label="Join URL">
                                {item.joinUrl ? (
                                  <span className="flex items-center gap-2">
                                    <a
                                      href={item.joinUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 truncate text-primary hover:underline"
                                    >
                                      {item.joinUrl}
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        navigator.clipboard?.writeText(item.joinUrl)
                                      }
                                      aria-label="Copy join URL"
                                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    >
                                      <Icon name="Copy" size={14} />
                                    </button>
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </Field>
                            </div>
                            <div className="col-span-2">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  item.insightType === "Created Today"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                }`}
                              >
                                {item.insightType}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Field label="Assigned">
                              {item.assignedUserName || "—"}
                            </Field>
                            <Field label="Created By">
                              {item.createdByName || "—"}
                            </Field>
                            <div className="col-span-2">
                              <Field label="Created">
                                {formatDate(item.createdAt)}
                              </Field>
                            </div>
                          </>
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InsightSheet;
