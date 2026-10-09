import React, { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Icon from "components/AppIcon";

/**
 * Export picker for the Leads header.
 *
 * Presentational only — the page owns the fetching and passes `phase` and
 * `progress` back in. Keeping the data flow out of here means the dialog can't
 * get stuck showing a spinner for an export that already failed.
 *
 * The progress shown is REAL, not a placeholder animation: the export pages
 * the API 200 rows at a time and reports after each page, so the bar reflects
 * how much has actually arrived. A fake spinner would have been less work and
 * would have looked identical right up to the moment a request stalls, which
 * is exactly when you'd want to know.
 */
const PHASES = { IDLE: "idle", WORKING: "working", DONE: "done" };

// Built from the app's own crimson (#AC2334, the header gradient and
// --color-primary) rather than a generic rainbow, so the burst reads as part
// of the product. Rose and amber sit either side of it on the wheel; the
// violet keeps the rotation from flattening into one hue.
const BRAND_CONIC =
  "conic-gradient(from 0deg, #AC2334, #F43F5E, #F59E0B, #8B5CF6, #AC2334)";

// Success swaps to greens so the ring confirms the outcome, not just the
// activity — the colour changes before anyone reads the text.
const SUCCESS_CONIC =
  "conic-gradient(from 0deg, #059669, #34D399, #A7F3D0, #059669)";

const ExportDialog = ({
  isOpen,
  onClose,
  options = [],
  onPick,
  phase = PHASES.IDLE,
  progress = { fetched: 0, target: 0 },
  resultCount = 0,
}) => {
  const busy = phase === PHASES.WORKING;
  const done = phase === PHASES.DONE;

  // An endlessly rotating halo is exactly what a motion-sensitivity setting is
  // asking us not to render. The dialog keeps every colour, just stops moving.
  const reduceMotion = useReducedMotion();

  // Escape closes — but never mid-export, where it would leave a request in
  // flight writing into a dialog that's gone.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, busy, onClose]);

  const pct = progress.target
    ? Math.min(100, Math.round((progress.fetched / progress.target) * 100))
    : 0;

  const conic = done ? SUCCESS_CONIC : BRAND_CONIC;
  // Spins faster while working, so the border itself carries the sense of
  // activity instead of relying on the spinner alone.
  const spin = reduceMotion
    ? {}
    : {
        animate: { rotate: 360 },
        transition: {
          duration: busy ? 2.8 : 9,
          repeat: Infinity,
          ease: "linear",
        },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Frosted backdrop. Click-away is disabled while exporting so a
              stray click can't orphan an in-flight request. */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[6px]"
            onClick={() => !busy && onClose?.()}
          />

          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Burst — a heavily blurred rotating cone of brand colour sitting
                well outside the card. This is the ambient glow; it never shows
                THROUGH the card, which is what keeps the text readable. */}
            <div className="pointer-events-none absolute -inset-10 overflow-hidden rounded-[40px] opacity-70">
              <motion.div
                className="absolute inset-[-40%] blur-3xl"
                style={{ background: conic }}
                {...spin}
              />
            </div>

            {/* Animated border — the same cone, unblurred, clipped to a 2px
                ring by the inset card on top of it. */}
            <div className="pointer-events-none absolute -inset-[2px] overflow-hidden rounded-[18px]">
              <motion.div
                className="absolute inset-[-50%]"
                style={{ background: conic }}
                {...spin}
              />
            </div>

            {/* Card. Opaque enough (85%) that the cone behind it stays a border
                and a halo rather than bleeding through the content, but still
                frosted against the page underneath. */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Export leads"
              className="relative overflow-hidden rounded-2xl bg-white/85 p-6 shadow-[0_24px_70px_-18px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
            >
              {/* Diagonal sheen so the surface reads as glass rather than a
                  flat translucent box. */}
              <div className="pointer-events-none absolute -top-1/2 left-0 h-[200%] w-full bg-gradient-to-br from-white/70 via-white/0 to-transparent" />

              <div className="relative">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Export leads
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      From the current filter &amp; sort
                    </p>
                  </div>
                  {!busy && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-white/70 text-slate-500 transition hover:bg-white hover:text-slate-800"
                    >
                      <Icon name="X" size={15} />
                    </button>
                  )}
                </div>

                {phase === PHASES.IDLE && (
                  <div className="space-y-2">
                    {options.map((count, i) => (
                      <motion.button
                        key={count}
                        type="button"
                        onClick={() => onPick?.(count)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
                        whileHover={{ x: 2 }}
                        className="group flex w-full items-center justify-between rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-white hover:shadow-lg active:scale-[0.99]"
                      >
                        <span className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white shadow-sm">
                            <Icon name="Download" size={16} />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-slate-900">
                              First {count} leads
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              {Math.ceil(count / 200)} request
                              {Math.ceil(count / 200) > 1 ? "s" : ""} to the CRM
                            </span>
                          </span>
                        </span>
                        <Icon
                          name="ChevronRight"
                          size={16}
                          className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary"
                        />
                      </motion.button>
                    ))}
                  </div>
                )}

                {busy && (
                  <div className="py-4 text-center">
                    <div className="relative mx-auto mb-4 h-16 w-16">
                      <span className="absolute inset-0 rounded-full border-4 border-primary/15" />
                      <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
                      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-primary">
                        {pct}%
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      Fetching leads…
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                      {progress.fetched} of {progress.target}
                    </p>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-rose-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {done && (
                  <motion.div
                    className="py-6 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <motion.div
                      className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600"
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 14 }}
                    >
                      <Icon name="Check" size={26} />
                    </motion.div>
                    <p className="text-sm font-semibold text-slate-900">
                      Exported {resultCount} lead{resultCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Your download should have started
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportDialog;
