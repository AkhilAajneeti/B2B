import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../../components/AppIcon";
import toast from "react-hot-toast";
import {
  toEspoDateTime,
  fromEspoToLocalInput,
} from "../../pipeline/utils/dateHelpers";

/**
 * QuickEditSheet — a mobile-first bottom sheet for the three fields a rep
 * touches after almost every call: Status, a quick note, and the next
 * follow-up. It slides up over the lead list (which stays visible behind a
 * dimmed, blurred backdrop) so the rep never loses their place.
 *
 * Deliberately NOT a full editor: Call / WhatsApp stay on the card, and
 * everything else lives in the drawer. This is the 10-second post-call update.
 *
 * Field mapping (matches the full DealDrawer form):
 *   Status       -> status
 *   Quick note   -> description
 *   Next follow  -> cNextContactAt  (stored in Espo datetime format)
 *
 * onSave(id, payload) should return a promise; the sheet shows a saving state
 * and closes on success, keeping it open on failure so the note isn't lost.
 */

// Curated, ordered subset for fast thumb selection — the statuses a rep sets
// most often right after a call, in the order they're most likely to pick.
// (The full status list still lives in the drawer for the rare cases.)
const STATUS_OPTIONS = [
  "Interested",
  "Follow up",
  "Call Later",
  "Call Not Picked",
  "Call Not Connecting",
  "Site Visit Scheduled",
  "Site Visit Done",
  "Switch Off",
  "Not Interested",
  "Low Budget",
  "Purchased",
  "New",
];

// Status pill colours — mirror DealsTable.getStageColor so the sheet feels
// like the same product as the card behind it.
const STATUS_COLOR = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Interested: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Follow up": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Call Later": "bg-amber-50 text-amber-700 border-amber-200",
  "Call Not Connecting": "bg-rose-50 text-rose-700 border-rose-200",
  "Call Not Picked": "bg-red-50 text-red-700 border-red-200",
  "Site Visit Scheduled": "bg-sky-50 text-sky-700 border-sky-200",
  "Site Visit Done": "bg-teal-50 text-teal-700 border-teal-200",
  "Switch Off": "bg-neutral-100 text-neutral-700 border-neutral-300",
  "Not Interested": "bg-red-50 text-red-700 border-red-200",
  "Low Budget": "bg-yellow-50 text-yellow-700 border-yellow-200",
  Purchased: "bg-green-50 text-green-700 border-green-200",
};
const selectedChip = (s) =>
  STATUS_COLOR[s] || "bg-primary/10 text-primary border-primary/30";

// Solid accent hue per status — drives the coloured "burst" glow + accent line
// at the top of the sheet. Mirrors the STATUS_COLOR pill families (roughly the
// 600 level) so the burst matches the selected chip. Falls back to the brand
// primary when nothing is selected or the status is unmapped.
const STATUS_ACCENT = {
  New: "#2563EB",
  Interested: "#059669",
  "Follow up": "#4F46E5",
  "Call Later": "#F59E0B",
  "Call Not Connecting": "#E11D48",
  "Call Not Picked": "#DC2626",
  "Site Visit Scheduled": "#0284C7",
  "Site Visit Done": "#0D9488",
  "Switch Off": "#737373",
  "Not Interested": "#DC2626",
  "Low Budget": "#CA8A04",
  Purchased: "#16A34A",
};
const accentFor = (s) => STATUS_ACCENT[s] || "var(--color-primary)";

const QuickEditSheet = ({ open, deal, onClose, onSave }) => {
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  // Top burst / accent colour follows the currently selected status.
  const accent = accentFor(status);

  // Reseed the form each time the sheet opens for a (possibly different) lead.
  // Note starts EMPTY rather than pre-filled with the existing description —
  // a quick note is about *this* call, and pre-filling risks a rep overwriting
  // history without meaning to.
  useEffect(() => {
    if (!open) return;
    setStatus(deal?.status || "");
    setNote("");
    setFollowUp(fromEspoToLocalInput(deal?.cNextContactAt) || "");
    setSaving(false);
  }, [open, deal]);

  // Lock background scroll while the sheet is up so the list behind can't move
  // under the rep's thumb.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape (physical keyboards / accessibility).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !saving && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  // Only send what the rep actually changed, so an untouched field can't
  // clobber a value set elsewhere. An emptied note is intentional → send "".
  const buildPayload = () => {
    const payload = {};
    if (status && status !== deal?.status) payload.status = status;
    // if (note.trim()) payload.description = note.trim();
    const originalFollow = fromEspoToLocalInput(deal?.cNextContactAt) || "";
    if (followUp !== originalFollow) {
      payload.cNextContactAt = followUp ? toEspoDateTime(followUp) : null;
    }
    return payload;
  };

  const dirty = useMemo(
    () => Object.keys(buildPayload()).length > 0 || note.trim().length > 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, note, followUp, deal],
  );

  const handleSave = async () => {
    if (!deal?.id || saving) return;
    // `fields` overwrites lead columns (incl. description); `note` is ALSO
    // logged to the activity stream so call history accumulates. The parent
    // handler applies both.
    const fields = buildPayload();
    const trimmedNote = note.trim();
    if (Object.keys(fields).length === 0 && !trimmedNote) {
      onClose?.();
      return;
    }
    try {
      setSaving(true);
      await onSave?.(deal.id, { fields, note: trimmedNote });
      toast.success("Lead updated");
      onClose?.();
    } catch (err) {
      console.error("Quick update failed", err);
      toast.error("Couldn't update lead");
      setSaving(false); // keep the sheet open so the note isn't lost
    }
  };

  // Quick follow-up presets — the taps reps make far more than picking a date.
  const setPreset = (kind) => {
    const d = new Date();
    if (kind === "tomorrow") d.setDate(d.getDate() + 1);
    if (kind === "3days") d.setDate(d.getDate() + 3);
    if (kind === "week") d.setDate(d.getDate() + 7);
    d.setHours(10, 0, 0, 0); // sensible default hour
    const pad = (n) => String(n).padStart(2, "0");
    setFollowUp(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
      )}:${pad(d.getMinutes())}`,
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop — dim + blur keeps the list visible for context */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !saving && onClose?.()}
          />

          {/* Sheet — solid surface (opaque background) so the blurred list
              behind can't bleed through and muddy it. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-[28px] border-t border-border bg-background shadow-[0_-8px_50px_rgba(20,20,40,0.22)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            // Drag-to-dismiss for one-handed use.
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (!saving && (info.offset.y > 120 || info.velocity.y > 700))
                onClose?.();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick update lead"
          >
            {/* Status burst — a soft blurred colour bloom at the top that
                matches the selected status. Keyed on `accent` so tapping a new
                status re-triggers the bloom animation. Clipped by the sheet's
                overflow-hidden so it reads as light spilling in from the top. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={accent}
                  initial={{ opacity: 0, scale: 0.75 }}
                  animate={{ opacity: 0.4, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="-mt-20 h-44 w-80 rounded-full blur-3xl"
                  style={{ backgroundColor: accent }}
                />
              </AnimatePresence>
            </div>

            {/* Accent line across the very top, coloured to the status */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-[3px] transition-colors duration-300"
              style={{
                background: `linear-gradient(to right, transparent, ${accent}, transparent)`,
              }}
            />

            {/* Grabber */}
            <div className="relative flex justify-center pt-3.5 pb-1">
              <span className="h-1.5 w-11 rounded-full bg-foreground/15" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 pt-1.5 pb-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold capitalize tracking-tight text-foreground">
                  {deal?.name || "Lead"}
                </h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Quick update
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && onClose?.()}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted active:scale-95"
              >
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">
              {/* Status */}
              <section>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => {
                    const active = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        // Selected ring is coloured to the status (via the
                        // Tailwind ring CSS var) instead of the blue primary,
                        // so it matches the pill instead of clashing with it.
                        style={active ? { "--tw-ring-color": accentFor(s) } : undefined}
                        className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition active:scale-95 ${
                          active
                            ? `${selectedChip(s)} ring-2 ring-offset-1 ring-offset-background shadow-sm`
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Quick Note */}
              <section>
                <label
                  htmlFor="quick-note"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  Quick Note
                </label>
                <textarea
                  id="quick-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add conversation notes..."
                  className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </section>

              {/* Next Follow-up */}
              <section>
                <label
                  htmlFor="quick-followup"
                  className="mb-2 block text-sm font-semibold text-foreground"
                >
                  Next Follow-up
                </label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {[
                    { k: "tomorrow", label: "Tomorrow" },
                    { k: "3days", label: "In 3 days" },
                    { k: "week", label: "Next week" },
                  ].map((p) => (
                    <button
                      key={p.k}
                      type="button"
                      onClick={() => setPreset(p.k)}
                      className="min-h-[40px] rounded-full border border-border bg-card px-3.5 text-sm font-medium text-muted-foreground transition hover:bg-muted active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                  {followUp && (
                    <button
                      type="button"
                      onClick={() => setFollowUp("")}
                      className="min-h-[40px] rounded-full px-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 active:scale-95"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="quick-followup"
                  type="datetime-local"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-[15px] text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </section>
            </div>

            {/* Sticky footer — solid bar with a hairline top border */}
            <div
              className="flex items-center gap-3 border-t border-border bg-background px-5 pt-3"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="button"
                onClick={() => !saving && onClose?.()}
                className="min-h-[52px] flex-1 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="min-h-[52px] flex-[1.5] rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_var(--color-primary)] transition active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="Loader" size={16} className="animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Save Update"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickEditSheet;
