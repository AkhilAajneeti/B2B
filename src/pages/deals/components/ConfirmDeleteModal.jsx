import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../../../components/AppIcon";

/**
 * Animated dustbin — the lid hinges open and the can shakes, looping while the
 * dialog is on screen. Purely decorative.
 */
const AnimatedTrash = () => {
  const loop = {
    duration: 1.8,
    repeat: Infinity,
    repeatDelay: 0.5,
    ease: "easeInOut",
  };

  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Lid — lifts and tilts open */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ y: [0, -3.5, -3, 0], rotate: [0, -16, -13, 0] }}
        transition={loop}
      >
        <path d="M3 6h18" />
        <path d="M9 6V4.2A1.2 1.2 0 0 1 10.2 3h3.6A1.2 1.2 0 0 1 15 4.2V6" />
      </motion.g>

      {/* Can — subtle shake as the "lead" drops in */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={{ x: [0, -0.7, 0.7, -0.5, 0] }}
        transition={loop}
      >
        <path d="M5.5 6.5l.9 13.2A2 2 0 0 0 8.4 21.5h7.2a2 2 0 0 0 2-1.8l.9-13.2" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </motion.g>
    </svg>
  );
};

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path
      d="M22 12a10 10 0 0 1-10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const ConfirmDeleteModal = ({
  open,
  title = "Delete",
  description,
  recordName,
  confirmLabel = "Delete",
  loading = false,
  onCancel,
  onConfirm,
}) => {
  // Escape closes, and body scroll locks while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e?.key === "Escape" && !loading) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={loading ? undefined : onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label={title}
              className="pointer-events-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-[rgba(20,20,30,0.08)] bg-card shadow-[0_24px_60px_-15px_rgba(16,24,40,0.35)]"
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              {/* Body */}
              <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center">
                {/* Soft red wash behind the icon */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-50 to-transparent"
                />

                {/* Icon with an expanding halo ring */}
                <div className="relative grid place-items-center">
                  <motion.span
                    aria-hidden="true"
                    className="absolute h-16 w-16 rounded-full bg-red-500/20 motion-reduce:hidden"
                    animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                  <span className="relative grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600 ring-8 ring-red-50">
                    <AnimatedTrash />
                  </span>
                </div>

                <h3 className="relative mt-5 text-[17px] font-bold tracking-tight text-foreground">
                  {title}
                </h3>

                {description && (
                  <p className="relative mt-1.5 max-w-[19rem] text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                )}

                {/* The exact record being destroyed — no ambiguity. */}
                {recordName && (
                  <div className="relative mt-4 w-full truncate rounded-xl border border-[rgba(20,20,30,0.08)] bg-muted/50 px-4 py-2.5 text-sm font-semibold text-foreground">
                    {recordName}
                  </div>
                )}

                <div className="relative mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <Icon name="AlertTriangle" size={13} />
                  This action cannot be undone
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 border-t border-[rgba(20,20,30,0.08)] bg-muted/30 p-4">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-[rgba(20,20,30,0.12)] bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(220,38,38,0.7)] transition-all hover:bg-red-700 hover:shadow-[0_10px_24px_-8px_rgba(220,38,38,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Icon name="Trash2" size={15} />
                      {confirmLabel}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;
