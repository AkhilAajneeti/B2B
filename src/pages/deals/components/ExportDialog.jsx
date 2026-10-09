import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
 * would have lied about a 3-request export that stalls on request 2.
 */
const PHASES = { IDLE: "idle", WORKING: "working", DONE: "done" };

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
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[6px]"
            onClick={() => !busy && onClose?.()}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Export leads"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_24px_70px_-18px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {/* Sheen — a soft diagonal highlight so the glass reads as glass
                rather than as a flat translucent box. */}
            <div className="pointer-events-none absolute -top-1/2 left-0 h-[200%] w-full bg-gradient-to-br from-white/60 via-white/0 to-transparent" />

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
                    className="grid h-8 w-8 place-items-center rounded-full border border-white/70 bg-white/60 text-slate-500 transition hover:bg-white hover:text-slate-800"
                  >
                    <Icon name="X" size={15} />
                  </button>
                )}
              </div>

              {phase === PHASES.IDLE && (
                <div className="space-y-2">
                  {options.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onPick?.(count)}
                      className="group flex w-full items-center justify-between rounded-xl border border-white/70 bg-white/60 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-white hover:shadow-md active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
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
                    </button>
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
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ ease: "easeOut", duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {phase === PHASES.DONE && (
                <motion.div
                  className="py-6 text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                    <Icon name="Check" size={26} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Exported {resultCount} lead{resultCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Your download should have started
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExportDialog;
