import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "../../../components/ui/Button";

/**
 * Animated dustbin — the lid hinges open and the can gives a little shake,
 * looping while the dialog is on screen. Purely decorative.
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

const ConfirmDeleteModal = ({
  open,
  title = "Delete",
  description,
  confirmLabel = "Delete",
  loading = false,
  onCancel,
  onConfirm,
}) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={loading ? undefined : onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        />

        {/* Modal */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AnimatedTrash />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={loading}
                loading={loading}
              >
                {loading ? "Deleting…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

export default ConfirmDeleteModal;
