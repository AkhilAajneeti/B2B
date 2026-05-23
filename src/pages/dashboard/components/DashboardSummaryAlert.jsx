import React, { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/AppIcon";
import { useUrgentLeads } from "../../../hooks/useUrgentLeads";

// Two independent session flags:
//   DISMISSED_KEY — set when the user clicks the X. While set, the alert stays
//                   hidden for the rest of the browser session. Cleared on
//                   tab close → next login the alert shows again.
//   SOUND_KEY     — set the first time the chime plays. Prevents the chime
//                   from replaying if the user just navigates away from the
//                   dashboard and comes back (alert itself stays visible
//                   silently, per spec).
const DISMISSED_KEY = "dashboardSummaryAlertDismissed";
const SOUND_KEY = "dashboardSummaryAlertSoundPlayed";

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

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:shadow-[0_6px_18px_-10px_rgba(15,23,42,0.18)] transition-all"
    >
      <div
        className={`w-8 h-8 ${styles.iconBg} rounded-lg flex items-center justify-center shrink-0`}
      >
        <Icon name={styles.icon} size={14} className={styles.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">
          {deal.title || "Untitled Lead"}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {deal.company || deal.project || deal.status || styles.label}
        </div>
      </div>
      <span
        className={`text-[10px] font-semibold uppercase tracking-wider ${styles.iconColor} hidden sm:inline-block`}
      >
        {styles.label}
      </span>
      <Icon
        name="ChevronRight"
        size={14}
        className="text-muted-foreground shrink-0"
      />
    </button>
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
 * Only shows on the first dashboard visit per session, plays a soft chime on
 * appearance, and is dismissible.
 */
const DashboardSummaryAlert = () => {
  const navigate = useNavigate();

  // Dismissed state is seeded from sessionStorage so the X-button decision
  // persists across in-session re-mounts (navigating away and back). The
  // alert ONLY disappears when the user clicks the X — no auto-hide.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!sessionStorage.getItem(DISMISSED_KEY);
    } catch {
      return false;
    }
  });

  // Shared with the Header notification dropdown — both surfaces stay synced
  // because they read from the same pipeline dataset via React Query cache.
  const urgent = useUrgentLeads();

  // Chime plays once per session, the first time the alert renders with real
  // urgent data. Subsequent navigations back to the dashboard keep the alert
  // visible silently.
  useEffect(() => {
    if (dismissed || urgent.total === 0) return;
    try {
      if (sessionStorage.getItem(SOUND_KEY)) return;
      sessionStorage.setItem(SOUND_KEY, "1");
    } catch {
      // sessionStorage unavailable — fall through and still play once per mount
    }
    playChime();
  }, [dismissed, urgent.total]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore — in-state dismissal still works for the current render
    }
  };

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
        className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3 pr-36">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name="BellRing" size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">
              Here's what needs you today
            </h3>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 mb-3">
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
            </div>

            {/* Clickable lead list — overdue first, then due today. Capped height
                so a busy day doesn't push the rest of the dashboard down. */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              {urgent.overdue.map((deal) => (
                <NotificationRow
                  key={`o-${deal.id}`}
                  deal={deal}
                  variant="overdue"
                  onClick={() => openLead(deal.id)}
                />
              ))}
              {urgent.dueToday.map((deal) => (
                <NotificationRow
                  key={`t-${deal.id}`}
                  deal={deal}
                  variant="dueToday"
                  onClick={() => openLead(deal.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Top-right actions — View pipeline pill + dismiss X, sitting together. */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/pipeline")}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-white border border-primary/30 text-primary text-xs font-semibold shadow-sm hover:bg-primary hover:text-white hover:border-primary hover:shadow-[0_6px_20px_-8px_rgba(99,102,241,0.45)] transition-all"
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
