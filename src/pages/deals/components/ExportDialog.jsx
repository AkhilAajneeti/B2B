/*
 * NOT CURRENTLY RENDERED — kept on purpose.
 *
 * This drove the Leads "Export" button (First 100/250/500 from the current
 * filter) before it was reverted to the simpler "Export All". It is fully
 * working and self-contained: pass `options`, `onPick`, `phase`, `progress`
 * and `resultCount` and it handles the rest, so any future export button can
 * reuse it without changes. Its partner in the service layer is
 * `fetchLeadsForExport`, which does the paging and reports progress.
 *
 * Don't delete it as dead code — it's parked, not abandoned.
 */
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
 * how much has actually arrived.
 */
const PHASES = { IDLE: "idle", WORKING: "working", DONE: "done" };

/**
 * The travelling-light border.
 *
 * Mostly transparent with one bright arc, so rotating it sweeps a comet of
 * colour around the edge instead of washing the whole card in a gradient. The
 * transparent run (0–58%) is what makes it read as a moving light rather than
 * a coloured ring — an earlier version used a fully-saturated cone and came
 * out as a block of colour around the dialog.
 *
 * Colours are the app's own crimson (#AC2334, the header gradient and
 * --color-primary) with rose and amber in the tail.
 */
const COMET_BRAND =
  "conic-gradient(from 0deg, transparent 0%, transparent 58%, rgba(172,35,52,0.5) 70%, #AC2334 80%, #F43F5E 88%, #F59E0B 94%, transparent 100%)";

// Success swaps the comet to greens, so the border confirms the outcome
// before anyone reads the text.
const COMET_SUCCESS =
  "conic-gradient(from 0deg, transparent 0%, transparent 58%, rgba(5,150,105,0.5) 70%, #059669 82%, #34D399 92%, transparent 100%)";

/**
 * Options come in two shapes, and both are supported on purpose.
 *
 *   number            the parked count picker — 100 / 250 / 500
 *   { key, label, … } the date-range picker, which also carries a count
 *
 * The count picker is commented out at both call sites rather than deleted,
 * so dropping number support here would quietly break it the day someone
 * uncomments it.
 */
const normalizeOption = (opt) =>
  typeof opt === "number"
    ? {
        key: opt,
        value: opt,
        label: `First ${opt} leads`,
        hint: `${Math.ceil(opt / 200)} request${Math.ceil(opt / 200) > 1 ? "s" : ""} to the CRM`,
        disabled: false,
      }
    : {
        key: opt.key,
        value: opt.value ?? opt.key,
        label: opt.label,
        hint: opt.hint || "",
        disabled: Boolean(opt.disabled),
      };

const ExportDialog = ({
  isOpen,
  onClose,
  options = [],
  onPick,
  phase = PHASES.IDLE,
  progress = { fetched: 0, target: 0 },
  resultCount = 0,
  // INDETERMINATE MODE. The server-side export is one request that either
  // returns a file or does not — there is nothing to report between those two
  // states. The header above says this dialog's bar is REAL and not a
  // placeholder, and that stays true: rather than animate a fake percentage,
  // this mode drops the number entirely and sweeps the bar, which says "still
  // working" without claiming to know how far along it is.
  indeterminate = false,
  title = "Export leads",
  subtitle = "From the current filter & sort",
  busyLabel = "Fetching leads…",
}) => {
  const busy = phase === PHASES.WORKING;
  const done = phase === PHASES.DONE;

  // A light looping forever around a border is exactly what a motion-
  // sensitivity setting asks us not to render. Everything else stays.
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

  const comet = done ? COMET_SUCCESS : COMET_BRAND;
  // Quicker while fetching, so the border itself carries the sense of work.
  const sweep = reduceMotion
    ? {}
    : {
        animate: { rotate: 360 },
        transition: {
          duration: busy ? 1.6 : 3.2,
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
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"
            onClick={() => !busy && onClose?.()}
          />

          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Soft bloom — the same comet, blurred, clipped tight to the card
                so the light appears to cast a little colour onto the page
                behind it. Held close on purpose: at a wider inset this stops
                being a glow and becomes a slab of colour. */}
            {!reduceMotion && (
              <div className="pointer-events-none absolute -inset-[6px] overflow-hidden rounded-[22px] opacity-80 blur-md">
                <motion.div
                  className="absolute inset-[-50%]"
                  style={{ background: comet }}
                  {...sweep}
                />
              </div>
            )}

            {/* The border itself. The card is a CHILD of this padded box, so
                the rotating gradient is only ever visible in the 1.5px the
                padding leaves exposed — that's what keeps it a hairline
                instead of bleeding behind the content. */}
            <div className="relative overflow-hidden rounded-2xl bg-slate-200/40 p-[1.5px] dark:bg-white/10">
              <motion.div
                className="pointer-events-none absolute inset-[-50%]"
                style={{ background: comet }}
                {...sweep}
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-label="Export leads"
                className="relative overflow-hidden rounded-[15px] bg-card/90 p-6 shadow-[0_24px_70px_-18px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
              >
                {/* Diagonal sheen so the surface reads as glass.
                    HARDCODED WHITE, SO IT NEEDS A DARK VARIANT. The slate
                    classes elsewhere in this file invert themselves — the
                    ramp is remapped per step in tailwind.css — but `white` is
                    white in both themes, and 70% of it over a near-black card
                    came out as a grey wash across the top-left corner rather
                    than as a highlight. 6% is enough to catch the eye at the
                    corner without lifting the whole surface. */}
                <div className="pointer-events-none absolute -top-1/2 left-0 h-[200%] w-full bg-gradient-to-br from-white/70 via-white/0 to-transparent dark:from-white/[0.06]" />

                <div className="relative">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {title}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>
                    </div>
                    {!busy && (
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-card/80 text-slate-500 transition hover:bg-card hover:text-slate-800 dark:border-white/15 dark:hover:bg-white/10"
                      >
                        <Icon name="X" size={15} />
                      </button>
                    )}
                  </div>

                  {phase === PHASES.IDLE && (
                    <div className="space-y-2">
                      {options.map(normalizeOption).map((opt, i) => (
                        <motion.button
                          key={opt.key}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => !opt.disabled && onPick?.(opt.value)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
                          whileHover={opt.disabled ? undefined : { x: 2 }}
                          className="group flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-card/70 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-card hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200/80 disabled:hover:bg-card/70 disabled:hover:shadow-none dark:border-white/[0.14] dark:bg-white/[0.04] dark:hover:border-primary/50 dark:hover:bg-white/[0.08] dark:disabled:hover:border-white/[0.14] dark:disabled:hover:bg-white/[0.04]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-rose-500 text-white shadow-sm">
                              <Icon name="Download" size={16} />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-slate-900">
                                {opt.label}
                              </span>
                              {/* The hint carries the count and, when a range
                                  holds more than the export cap, says what
                                  will actually be downloaded. Reserving the
                                  line even while it is empty stops the rows
                                  jumping as the counts arrive. */}
                              <span className="block min-h-[14px] text-[11px] text-slate-500">
                                {opt.hint}
                              </span>
                            </span>
                          </span>
                          <Icon
                            name="ChevronRight"
                            size={16}
                            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary dark:text-slate-500"
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
                        {!indeterminate && (
                          <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-primary">
                            {pct}%
                          </span>
                        )}
                        {indeterminate && (
                          <span className="absolute inset-0 grid place-items-center text-primary">
                            <Icon name="FileSpreadsheet" size={20} />
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-800">
                        {indeterminate ? busyLabel : "Fetching leads…"}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-slate-500">
                        {indeterminate
                          ? `${resultCount} lead${resultCount === 1 ? "" : "s"} · the server is building the sheet`
                          : `${progress.fetched} of ${progress.target}`}
                      </p>
                      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                        {indeterminate ? (
                          // A short bar travelling the track, not a width that
                          // grows: growth implies a measured fraction, and
                          // there isn't one. Under reduced motion it sits
                          // still at a third rather than sliding forever.
                          <motion.div
                            className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-rose-500"
                            initial={{ x: "-100%" }}
                            animate={reduceMotion ? { x: "100%" } : { x: ["-100%", "300%"] }}
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                            }
                          />
                        ) : (
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-rose-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ ease: "easeOut", duration: 0.3 }}
                          />
                        )}
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
                        className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:text-emerald-300"
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 14,
                        }}
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { PHASES };
export default ExportDialog;
