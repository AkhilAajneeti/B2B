import React, { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import { useUrgentLeads } from "../../../hooks/useUrgentLeads";

// Format a Date as `HH:MM` in the user's locale (24h with leading zeros).
const formatClock = (date) =>
  date
    ? date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

// Parse an ESPO-style datetime (either ISO or "YYYY-MM-DD HH:mm:ss") and
// format as e.g. "16 May, 02:30 PM". Returns "" for falsy / invalid input.
const formatDueDateTime = (value) => {
  if (!value) return "";
  const d = new Date(
    typeof value === "string" ? value.replace(" ", "T") : value,
  );
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Tiny WebAudio chime — two soft sine notes. No external assets, no autoplay
// issues after a fresh login (the login click counts as user interaction).
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.04);
      gain.gain.linearRampToValueAtTime(0, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch {
    // Autoplay blocked / context unavailable — silent fallback, the alert
    // still renders.
  }
};

const NotificationRow = ({ deal, variant, onClick }) => {
  const styles =
    variant === "overdue"
      ? {
          iconBg: "bg-red-50",
          iconColor: "text-red-600",
          icon: "AlertCircle",
          label: "Overdue",
        }
      : {
          iconBg: "bg-orange-50",
          iconColor: "text-orange-600",
          icon: "CalendarClock",
          label: "Today",
        };

  const fullTitle = deal.title || "Untitled Lead";

  const phone =
    deal.raw?.phoneNumber ||
    deal.raw?.phoneNumberMobile ||
    deal.raw?.cAlternateNumber ||
    "";
  const projectName = deal.project || deal.company || "";
  const dueDateTime = formatDueDateTime(deal.nextContactDate);

  const metaLineOne = [deal.status, projectName].filter(Boolean);
  const metaLineTwo = [phone, dueDateTime].filter(Boolean);

  // `div role="button"` instead of a real <button> so we can legally nest
  // an <a href="tel:…"> inside for the click-to-call action on mobile.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="cursor-pointer w-full text-left flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:shadow-[0_6px_18px_-10px_rgba(15,23,42,0.18)] transition-all"
      title={fullTitle}
    >
      <div
        className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}
      >
        <Icon name={styles.icon} size={14} className={styles.iconColor} />
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-sm font-medium text-foreground break-words line-clamp-2 sm:line-clamp-none sm:truncate leading-snug">
          {fullTitle}
        </div>

        {/* Meta line 1 — status pill + project name. */}
        {metaLineOne.length > 0 && (
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            {deal.status && (
              <span
                className={`px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wider ${styles.iconBg} ${styles.iconColor}`}
              >
                {deal.status}
              </span>
            )}
            {projectName && (
              <span className="truncate">{projectName}</span>
            )}
          </div>
        )}

        {/* Meta line 2 — tap-to-call icon (mobile only) + due date/time. */}
        {metaLineTwo.length > 0 && (
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {phone && (
              <a
                href={`tel:${phone}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Call ${phone}`}
                title={`Call ${phone}`}
                // Icon-only on mobile, hidden on desktop per current scope.
                className="sm:hidden inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
              >
                <Icon name="Phone" size={14} />
              </a>
            )}
            {dueDateTime && (
              <span className={`inline-flex items-center gap-1 ${styles.iconColor}`}>
                <Icon name="CalendarClock" size={10} />
                {dueDateTime}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right rail — badge + chevron grouped so they vertically center
          together against the multi-line content (rather than top-aligning
          with the title via individual `mt-*` hacks). */}
      <div className="flex items-center gap-2 self-center shrink-0">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${styles.iconColor} hidden sm:inline-block`}
        >
          {styles.label}
        </span>
        <Icon
          name="ChevronRight"
          size={14}
          className="text-muted-foreground"
        />
      </div>
    </div>
  );
};

/**
 * DashboardSummaryAlert — first-visit alert for the Dashboard.
 *
 * Pulls overdue + due-today leads from the shared pipeline data hook (no extra
 * network call if the user has already visited the Pipeline page this session).
 * Lists each urgent lead as a clickable row that navigates to /leads with the
 * lead id in router state — the deals page reads `location.state.leadId`,
 * fetches by id, and opens the drawer automatically.
 *
 * Refreshes on every dashboard visit: each mount triggers a refetch so the
 * urgent counts reflect the latest pipeline state, not stale cache. Plays a
 * soft chime once per visit when there's urgent work, dismissible via the X
 * (only for the current view — navigating away and back shows it again).
 */
const DashboardSummaryAlert = () => {
  const navigate = useNavigate();

  // Local dismiss + chime-played state — reset on every mount, so each
  // dashboard visit starts fresh (alert visible, chime ready to play once).
  const [dismissed, setDismissed] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const playedRef = useRef(false);

  // Shared with the Header notification dropdown — both surfaces stay synced
  // because they read from the same pipeline dataset via React Query cache.
  const { refetch, isFetching, ...urgent } = useUrgentLeads();

  // Force a fresh pipeline fetch on every dashboard visit. `refetch` from
  // React Query bypasses staleTime and re-hits the network — exactly what
  // we want for "show the latest data each time you land on the dashboard".
  useEffect(() => {
    if (!refetch) {
      setLastRefreshedAt(new Date());
      return;
    }
    refetch().finally(() => setLastRefreshedAt(new Date()));
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chime plays once per visit when urgent data actually lands. The ref
  // guards against re-firing if the urgent count changes during the visit.
  useEffect(() => {
    if (dismissed || urgent.total === 0 || playedRef.current) return;
    playChime();
    playedRef.current = true;
  }, [dismissed, urgent.total]);

  const handleDismiss = () => setDismissed(true);

  if (dismissed || urgent.total === 0) return null;

  const openLead = (leadId) => {
    if (!leadId) return;
    navigate("/leads", { state: { leadId } });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-2.5 sm:p-4"
      >
        {/* Mobile reserves space only for the X (8 = 2rem). Desktop also makes
            room for the absolute-positioned View pipeline pill (36 = 9rem). */}
        <div className="flex items-start gap-2 sm:gap-3 pr-9 sm:pr-36">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="BellRing" size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">
                Here's what needs you today
              </h3>
              {/* Freshness indicator: shows the time of the last successful
                  fetch, or a "Refreshing…" pill while a refetch is in flight. */}
              {isFetching ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Icon name="Loader2" size={10} className="animate-spin" />
                  Refreshing…
                </span>
              ) : lastRefreshedAt ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
                  <Icon name="Clock" size={10} />
                  Updated {formatClock(lastRefreshedAt)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 mb-3">
              {urgent.dueToday.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon
                    name="CalendarClock"
                    size={14}
                    className="text-orange-600"
                  />
                  <span className="font-bold text-orange-600">
                    {urgent.dueToday.length}
                  </span>
                  {urgent.dueToday.length === 1
                    ? "follow-up today"
                    : "follow-ups today"}
                </span>
              )}
              {urgent.overdue.length > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="AlertCircle" size={14} className="text-red-600" />
                  <span className="font-bold text-red-600">
                    {urgent.overdue.length}
                  </span>
                  {urgent.overdue.length === 1
                    ? "overdue lead"
                    : "overdue leads"}
                </span>
              )}
            </div>

            {/* Clickable lead list — today's follow-ups first (most immediately
                actionable), then overdue. Capped height so a busy day doesn't
                push the rest of the dashboard down. */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              {urgent.dueToday.map((deal) => (
                <NotificationRow
                  key={`t-${deal.id}`}
                  deal={deal}
                  variant="dueToday"
                  onClick={() => openLead(deal.id)}
                />
              ))}
              {urgent.overdue.map((deal) => (
                <NotificationRow
                  key={`o-${deal.id}`}
                  deal={deal}
                  variant="overdue"
                  onClick={() => openLead(deal.id)}
                />
              ))}
            </div>

            {/* Mobile-only View pipeline button. On sm+ this lives in the
                top-right action cluster instead. */}
            <button
              type="button"
              onClick={() => navigate("/pipeline")}
              className="sm:hidden mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-primary/30 text-primary text-xs font-semibold shadow-sm hover:bg-primary hover:text-white transition-colors"
              aria-label="Open pipeline"
            >
              <Icon name="Kanban" size={14} />
              <span>View pipeline</span>
              <Icon name="ArrowRight" size={12} />
            </button>
          </div>
        </div>

        {/* Top-right actions — View pipeline pill (desktop only) + dismiss X.
            On mobile the pill moves to a full-width button below the list so
            the title and lead names get the full card width to themselves. */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/pipeline")}
            className="hidden sm:inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-white border border-primary/30 text-primary text-xs font-semibold shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:shadow-[0_6px_20px_-8px_rgba(99,102,241,0.45)] transition-all"
            aria-label="Open pipeline"
          >
            <Icon name="Kanban" size={14} />
            <span>View pipeline</span>
            <Icon name="ArrowRight" size={12} className="ml-0.5" />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
            aria-label="Dismiss summary"
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default memo(DashboardSummaryAlert);
