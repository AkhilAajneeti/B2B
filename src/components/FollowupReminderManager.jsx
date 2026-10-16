import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchTodayFollowups } from "services/reminder.service";
import Icon from "components/AppIcon";

/**
 * FollowupReminderManager
 *
 * A single, app-global manager (mounted once inside the router, above the
 * pages) that pops a reminder when a lead's "today" follow-up time arrives,
 * on whatever CRM page the rep is currently on.
 *
 * Design (matches what we agreed on):
 *  - Reuses ONE cached query of today's follow-ups (no per-tick API calls).
 *  - Runs ONE setTimeout to the nearest upcoming follow-up, then chains to the
 *    next nearest after each fire - not N parallel timers.
 *  - Recomputes whenever the data changes (handles mid-day reschedules / new).
 *  - On load, surfaces follow-ups whose time already passed today as "missed".
 *  - De-dupes fired reminders across reloads and tabs via localStorage.
 *
 * Scope (intentional): TODAY only, and only while a CRM tab is open. A closed
 * tab cannot fire - that is a known, accepted limit of the browser platform.
 */

const SETTIMEOUT_MAX = 2 ** 31 - 1; // ~24.8 days; today's max delay is < 24h
const SNOOZE_MS = 10 * 60 * 1000;
// How long the stack auto-pops open after a new reminder lands. Just enough
// for the rep to register the new arrival without being intrusive.
const AUTO_EXPAND_MS = 3 * 1000;

/* --- date helpers (kept local so this stays independent of the pipeline) --- */

// EspoCRM datetimes ("YYYY-MM-DD HH:mm:ss") are UTC. Append Z so JS parses
// the instant correctly; downstream `Date` methods (getHours, isToday, etc.)
// then operate on the user's local timezone, which is what we want.
const parseLocal = (value) => {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.length <= 10 ? `${s}T12:00:00Z` : `${s.replace(" ", "T")}Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const isToday = (date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatTime = (date) =>
  date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/* --- fired-set persistence (date-scoped, shared across tabs) --- */

const firedKey = () => `followup_fired_${new Date().toISOString().slice(0, 10)}`;

const loadFired = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(firedKey())) || []);
  } catch {
    return new Set();
  }
};

const persistFired = (set) => {
  try {
    localStorage.setItem(firedKey(), JSON.stringify([...set]));
  } catch {
    /* storage full / disabled - dedup degrades to per-session, acceptable */
  }
};

/* --- sound (Web Audio beep, no asset needed) --- */

let audioCtx = null;

const primeAudio = () => {
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* Web Audio unavailable - reminders still show visually */
  }
};

const playBeep = () => {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    const t = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.start(t);
    osc.stop(t + 0.45);
  } catch {
    /* ignore - visual popup is the source of truth */
  }
};

const FollowupReminderManager = () => {
  const navigate = useNavigate();
  // Subscribing to location makes this globally-mounted manager re-render on
  // navigation, so it re-reads the token right after login (soft navigate, no
  // reload) and starts the query then - instead of waiting for a page reload.
  const location = useLocation();
  const onLoginPage = location.pathname === "/login";
  const token = localStorage.getItem("auth_token");

  const timerRef = useRef(null);
  const snoozeTimersRef = useRef([]);
  const firedRef = useRef(loadFired());
  // Stack rendering — `activeReminders` holds every entry currently on-screen
  // (newest at the end). `expanded` is the open/closed state of the deck.
  // `autoExpandTimerRef` lets us briefly pop the stack open when a new
  // reminder lands so the rep notices, then collapse back automatically.
  const autoExpandTimerRef = useRef(null);
  const [activeReminders, setActiveReminders] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const { data } = useQuery({
    queryKey: ["today-followups"],
    queryFn: fetchTodayFollowups,
    enabled: !!token && !onLoginPage,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // re-sync reschedules / new follow-ups
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Normalise -> keep only today (local) -> sort by time ascending.
  const reminders = useMemo(() => {
    const list = data?.list || [];
    return list
      .map((lead) => ({
        id: lead.id,
        name: lead.name || lead.firstName || "Lead",
        project: lead.cProject || "",
        owner: lead.assignedUserName || "",
        time: parseLocal(lead.cNextContactAt),
      }))
      .filter((r) => r.time && isToday(r.time))
      .sort((a, b) => a.time - b.time);
  }, [data]);

  // Unlock audio + ask for OS-notification permission on the first interaction.
  useEffect(() => {
    const onFirstGesture = () => {
      primeAudio();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  // Keep dedup state in sync when another tab fires a reminder.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === firedKey()) firedRef.current = loadFired();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const markFired = (id) => {
    firedRef.current.add(id);
    persistFired(firedRef.current);
  };

  // Accepts a single reminder or an array; multiple due at the same moment are
  // shown as ONE grouped entry to keep the stack uncluttered. Each entry adds
  // a card to `activeReminders`; the rendered deck/expanded view is below.
  const addReminder = (group) => {
    const items = Array.isArray(group) ? group : [group];
    if (!items.length) return;

    playBeep();

    const isGroup = items.length > 1;
    const lead = items[0];
    const names = items.map((r) => r.name);
    const namePreview =
      names.length <= 3
        ? names.join(", ")
        : `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
    const groupId = `group-${lead.time.getTime()}`;
    const entryId = isGroup ? `reminder-${groupId}` : `reminder-${lead.id}`;

    // OS-level notification when the tab isn't focused — UNCHANGED from before.
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.hidden
    ) {
      try {
        const n = new Notification(
          isGroup ? `${items.length} follow-ups due now` : "Follow-up reminder",
          {
            body: isGroup
              ? namePreview
              : `${lead.name} • ${formatTime(lead.time)}${
                  lead.project ? ` • ${lead.project}` : ""
                }`,
            tag: isGroup ? groupId : lead.id,
            requireInteraction: true,
          },
        );
        n.onclick = () => {
          window.focus();
          navigate("/leads", { state: { leadId: lead.id } });
          n.close();
        };
      } catch {
        /* ignore */
      }
    }

    // Push to stack state (skip if this exact entry is already present so
    // the same group never appears twice if both the timer and the poll
    // fire it).
    setActiveReminders((prev) => {
      if (prev.some((e) => e.id === entryId)) return prev;
      return [
        ...prev,
        { id: entryId, items, time: lead.time, isGroup, namePreview },
      ];
    });

    // Auto-expand briefly so the rep notices a new reminder landing on top
    // of a stack they may have collapsed earlier.
    setExpanded(true);
    if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
    autoExpandTimerRef.current = setTimeout(
      () => setExpanded(false),
      AUTO_EXPAND_MS,
    );
  };

  const removeReminder = (id) =>
    setActiveReminders((prev) => prev.filter((e) => e.id !== id));

  const handleView = (entry) => {
    const lead = entry.items[0];
    navigate("/leads", { state: { leadId: lead.id } });
    removeReminder(entry.id);
  };

  const handleSnooze = (entry) => {
    const handle = setTimeout(() => addReminder(entry.items), SNOOZE_MS);
    snoozeTimersRef.current.push(handle);
    removeReminder(entry.id);
  };

  const handleDismiss = (entry) => removeReminder(entry.id);

  // Scheduler. Background tabs heavily throttle setTimeout, so we don't rely on
  // a chained timer alone: a 30s poll + a visibility listener guarantee that
  // anything due fires (within ~1 min while backgrounded, instantly on return).
  useEffect(() => {
    // Fire every reminder now due (several at the same time -> one grouped
    // popup), de-duped via firedRef so nothing fires twice.
    const fireDue = () => {
      const now = Date.now();
      const due = reminders.filter(
        (r) => r.time.getTime() <= now && !firedRef.current.has(r.id),
      );
      if (!due.length) return;
      due.forEach((r) => markFired(r.id));
      addReminder(due);
    };

    // Precise timer to the nearest upcoming reminder (exact firing while the
    // tab is in the foreground), re-armed after each fire.
    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const ts = Date.now();
      const next = reminders.find(
        (r) => r.time.getTime() > ts && !firedRef.current.has(r.id),
      );
      if (!next) return;
      const delay = Math.min(
        Math.max(next.time.getTime() - ts, 0),
        SETTIMEOUT_MAX,
      );
      timerRef.current = setTimeout(() => {
        fireDue();
        scheduleNext();
      }, delay);
    };

    fireDue(); // anything already due on load / after a data change
    scheduleNext();

    // Safety net: catches reminders the throttled background timer missed, and
    // fires instantly the moment the rep returns to the tab.
    const poll = setInterval(fireDue, 30 * 1000);
    const onVisible = () => {
      if (!document.hidden) {
        fireDue();
        scheduleNext();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  // Clean up any pending snooze timers + the auto-expand timer on unmount.
  useEffect(() => {
    const snoozeTimers = snoozeTimersRef.current;
    return () => {
      snoozeTimers.forEach((h) => clearTimeout(h));
      if (autoExpandTimerRef.current) clearTimeout(autoExpandTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------
  // STACK UI — replaces the per-toast popups. Collapsed view shows ONE card
  // with peek-cards behind it and a count badge. Click to expand into the
  // full list with View / Snooze / Dismiss buttons per entry, color-coded
  // so the intent of each action is obvious at a glance:
  //   View   → orange (primary action)
  //   Snooze → amber  (defer)
  //   Dismiss → gray, red hover (passive remove)
  // ---------------------------------------------------------------------
  if (activeReminders.length === 0) return null;

  // Top of the stack = newest reminder. Reps see the most recent push.
  const topEntry = activeReminders[activeReminders.length - 1];
  const total = activeReminders.length;

  const cancelAutoCollapse = () => {
    if (autoExpandTimerRef.current) {
      clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
  };

  // Drop every active reminder at once. Same intent as Dismiss on a single
  // card, applied to the whole stack. Cancels the auto-collapse timer first so
  // nothing tries to re-fire against an empty stack.
  const dismissAll = () => {
    cancelAutoCollapse();
    setActiveReminders([]);
    setExpanded(false);
  };

  return (
    <div
      className="fixed top-4 right-4 z-[60] w-[92vw] max-w-sm pointer-events-auto"
      // Any deliberate interaction with the stack cancels auto-collapse so
      // a rep mid-read doesn't have it slam shut on them.
      onMouseEnter={cancelAutoCollapse}
      onPointerDown={cancelAutoCollapse}
    >
      {expanded ? (
        /* EXPANDED — vertical list of all active reminders */
        <div className="bg-white rounded-2xl shadow-[0_18px_50px_-12px_rgba(249,115,22,0.30)] border border-orange-200/80 overflow-hidden">
          {/* Header strip — cream ground, rounded-square icon tile, title in
              deep orange rather than grey. */}
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-50/90 border-b border-orange-100">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-500">
              <Icon name="Phone" size={18} strokeWidth={2.5} />
            </span>
            <p className="flex-1 text-[15px] font-bold text-orange-900">
              {total} follow-up{total > 1 ? "s" : ""} pending
            </p>
            <button
              onClick={dismissAll}
              className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Dismiss all reminders"
              title="Dismiss all"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
            {activeReminders.map((entry) => {
              const lead = entry.items[0];
              const headline = entry.isGroup
                ? `${entry.items.length} Call Later reminders`
                : "Call Later reminder";
              const subhead = entry.isGroup ? entry.namePreview : lead.name;
              return (
                <div key={entry.id} className="relative overflow-hidden p-4">
                  {/* Decorative swooshes from the reference. Pure ornament, so
                      aria-hidden and pointer-events-none — it must never
                      intercept a click meant for the actions. */}
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 bottom-0 h-32 w-56 text-orange-100"
                    viewBox="0 0 220 130"
                    fill="none"
                  >
                    <path
                      d="M0 96c46-6 70-40 118-46 34-4 62 8 102 2v78H0z"
                      fill="currentColor"
                      opacity="0.55"
                    />
                    <path
                      d="M8 120c54-10 78-34 128-38 32-3 58 6 84 2v46H8z"
                      fill="currentColor"
                      opacity="0.45"
                    />
                    <path
                      d="M150 36c34 2 58 20 66 44"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="1 9"
                    />
                  </svg>

                  <div className="relative flex items-start gap-4">
                    {/* Rounded-square tile with a dotted ring and a dot badge,
                        matching the reference's larger glyph treatment. */}
                    <div className="relative h-16 w-16 shrink-0">
                      <div className="grid h-full w-full place-items-center rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100">
                        <Icon
                          name="Phone"
                          size={26}
                          strokeWidth={2.5}
                          className="text-orange-500"
                        />
                      </div>
                      <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        {headline}
                      </span>
                      <p className="mt-2 truncate text-lg font-bold text-slate-900">
                        {subhead}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {formatTime(entry.time)}
                        {!entry.isGroup && lead.project
                          ? ` • ${lead.project}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* View is the circular button from the reference. Snooze and
                      Dismiss stay as quiet text actions — the reference shows
                      only the one control, but dropping the other two would
                      remove working behaviour, so they are demoted rather than
                      deleted. */}
                  <div className="relative mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleSnooze(entry)}
                        className="text-xs font-semibold text-slate-500 transition-colors hover:text-orange-600"
                      >
                        Snooze 10m
                      </button>
                      <button
                        onClick={() => handleDismiss(entry)}
                        className="text-xs font-semibold text-slate-400 transition-colors hover:text-red-600"
                      >
                        Dismiss
                      </button>
                    </div>
                    <button
                      onClick={() => handleView(entry)}
                      aria-label={`View ${subhead}`}
                      title="View lead"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-500 text-white shadow-[0_8px_20px_-6px_rgba(249,115,22,0.8)] ring-4 ring-white transition hover:bg-orange-600 active:scale-95"
                    >
                      <Icon name="Eye" size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* COLLAPSED — deck-of-cards: top card with two ghost cards peeking */
        /* COLLAPSED — the deck, plus a dismiss-all control that appears on
           hover. The dismiss button is a SIBLING of the expand button, not a
           child: the whole card is itself a <button>, and nesting one button
           inside another is invalid HTML that browsers resolve unpredictably.
           A wrapper with a named group lets hovering anywhere on the deck
           reveal it without the two controls nesting. */
        <div className="relative group/deck">
        <button
          type="button"
          onClick={() => {
            cancelAutoCollapse();
            setExpanded(true);
          }}
          className="relative w-full text-left group focus:outline-none"
          aria-label={`Expand ${total} pending follow-up reminders`}
        >
          {/* Peek cards behind — render up to 2 so the deck feels thick
              without becoming a tower at high counts. */}
          {total > 2 && (
            <div className="absolute inset-x-3 top-3 -bottom-3 bg-orange-50 rounded-xl border border-orange-200 shadow" />
          )}
          {total > 1 && (
            <div className="absolute inset-x-1.5 top-1.5 -bottom-1.5 bg-white rounded-xl border border-orange-200 shadow" />
          )}

          {/* Top card */}
          <div className="relative flex items-center gap-4 rounded-2xl border border-orange-200/80 bg-white p-4 shadow-[0_12px_32px_-12px_rgba(249,115,22,0.35)] transition group-hover:shadow-[0_16px_40px_-12px_rgba(249,115,22,0.45)] group-active:scale-[0.99]">
            {/* Circular tile with a dot badge — the reference's collapsed
                state uses a circle here, against the expanded state's rounded
                square. */}
            <div className="relative h-12 w-12 shrink-0">
              <div className="grid h-full w-full place-items-center rounded-full bg-orange-100">
                <Icon
                  name="Phone"
                  size={20}
                  strokeWidth={2.5}
                  className="text-orange-500"
                />
              </div>
              <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-orange-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-slate-900">
                {total === 1
                  ? "Follow-up reminder"
                  : `${total} follow-ups pending`}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {topEntry.isGroup
                  ? topEntry.namePreview
                  : topEntry.items[0].name}
              </p>
            </div>

            {total > 1 && (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white">
                {total}
              </span>
            )}
            <Icon
              name="ChevronRight"
              size={20}
              className="shrink-0 text-slate-400"
            />
          </div>
        </button>

        {/* Dismiss all — hidden until the deck is hovered, so the resting card
            stays clean. Also revealed on keyboard focus, and shown
            unconditionally where hover doesn't exist (touch), since otherwise
            it would be unreachable on a phone. */}
        <button
          type="button"
          onClick={dismissAll}
          className="absolute -top-2 -right-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-orange-200 bg-white text-gray-400 shadow-md opacity-0 transition-opacity hover:text-red-600 hover:border-red-200 hover:bg-red-50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 group-hover/deck:opacity-100 [@media(hover:none)]:opacity-100"
          aria-label={`Dismiss ${total} pending follow-up reminder${total > 1 ? "s" : ""}`}
          title="Dismiss all"
        >
          <span className="text-sm leading-none">✕</span>
        </button>
        </div>
      )}
    </div>
  );
};

export default FollowupReminderManager;
