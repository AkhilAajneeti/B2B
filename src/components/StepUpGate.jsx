/**
 * The step-up verification dialog, and the single place it is mounted.
 *
 * Sensitive actions — today everything under /Export — need proof that the
 * person at the keyboard is still the account holder, even though they are
 * already signed in. This renders "Confirm it is you", collects a 6-digit
 * code, and resolves the promise that `ensureStepUp()` is waiting on.
 *
 * WHY A GATE RATHER THAN A DIALOG PER CALL SITE. The verification can be
 * triggered from a button that knows it is protected (ask-first) or from a
 * 403 on a request the UI did not know was protected (the safety net in
 * `withStepUp`). The second has no component to hang a dialog off at all. So
 * this mounts once, hands its opener to the service layer, and both paths go
 * through it — which is also what keeps two quick clicks from opening two
 * dialogs with mutually invalidating codes.
 *
 * MOUNT IT ONCE, in App, OUTSIDE the router. A dialog inside a route would
 * unmount on navigation and leave `ensureStepUp()` pending forever.
 *
 * THE FORM ITSELF IS OtpStep, the sign-in component, with different wording
 * and a 5-minute lifetime passed in. Reimplementing a 6-box OTP input would
 * mean rewriting the paste-spreading, the backspace behaviour and the
 * throttle-proof countdown — and the two would then drift.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "components/AppIcon";
import OtpStep from "pages/login/components/OtpStep";
import {
  registerStepUpDialog,
  requestStepUpCode,
  verifyStepUpCode,
  StepUpCancelled,
} from "services/stepUp.service";

/** A step-up code lives 5 minutes, against the login code's 15. */
const STEP_UP_TTL_MS = 5 * 60 * 1000;

/**
 * What each 400 from /auth/step-up/verify means, in the user's words.
 *
 * `needsNewCode` drives whether the boxes stay usable: a wrong code is worth
 * retyping, an expired or foreign challenge is not — nothing typed into those
 * boxes can succeed, so leaving them live would just collect another failure.
 */
const VERIFY_ERRORS = {
  invalid_otp: {
    text: "That code is not right. Check it and try again.",
    needsNewCode: false,
  },
  otp_expired: {
    text: "That code has expired. Send a new one to continue.",
    needsNewCode: true,
  },
  invalid_challenge: {
    text: "This verification is no longer valid. Send a new code to continue.",
    needsNewCode: true,
  },
};

const GENERIC_VERIFY_ERROR = "Could not verify that code. Please try again.";

const StepUpGate = () => {
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [clearAt, setClearAt] = useState(0);

  // The promise `ensureStepUp()` is awaiting. Held in a ref because the
  // settle functions must survive re-renders without being state themselves.
  const settle = useRef(null);

  const close = useCallback(() => {
    setChallenge(null);
    setError("");
    setIsVerifying(false);
    settle.current = null;
  }, []);

  /**
   * Registered with the service layer. Opens the dialog and resolves with the
   * verify response body once a correct code is entered.
   */
  useEffect(
    () =>
      registerStepUpDialog(
        (started) =>
          new Promise((resolve, reject) => {
            settle.current = { resolve, reject };
            setError("");
            setIsVerifying(false);
            setChallenge({ ...started, issuedAt: Date.now() });
          }),
      ),
    [],
  );

  const handleVerify = async (code) => {
    if (!challenge) return;
    setIsVerifying(true);
    setError("");

    try {
      const { status, data } = await verifyStepUpCode(code, challenge.challengeToken);

      if (status === 200 && data?.status === "success" && data?.token) {
        // Resolve BEFORE closing: the caller stores the re-issued token and
        // records the elevation, and unmounting first would drop the promise.
        settle.current?.resolve(data);
        close();
        return;
      }

      const known = VERIFY_ERRORS[data?.status];
      setError(known?.text || data?.error || GENERIC_VERIFY_ERROR);
      // A retypeable failure clears the boxes; a dead challenge leaves them
      // as they are, since the "send a new code" button is the only way out.
      if (!known?.needsNewCode) setClearAt(Date.now());
    } catch (err) {
      // verifyStepUpCode only throws on a 401, where it has already started
      // the logout. Showing the message keeps the dialog honest in the moment
      // before the redirect lands.
      setError(err?.message || GENERIC_VERIFY_ERROR);
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * "Send a new code" — /auth/step-up again, because step-up has no resend
   * endpoint. The NEW challengeToken must replace the old one: issuing a code
   * kills the previous challenge, so keeping it would guarantee an
   * `invalid_challenge` on the next attempt.
   */
  const handleResend = async () => {
    try {
      const next = await requestStepUpCode();
      setChallenge({ ...next, issuedAt: Date.now() });
      setError("");
    } catch (err) {
      setError(err?.message || "Could not send a new code.");
    }
  };

  /** Cancel. The action is abandoned; the user stays signed in. */
  const handleCancel = useCallback(() => {
    settle.current?.reject(new StepUpCancelled());
    close();
  }, [close]);

  // Escape closes, as it does in every other dialog here. Not while a verify
  // is in flight — that request is about to swap the session token, and
  // dropping the dialog mid-way leaves the caller waiting on a promise that
  // has already been rejected.
  useEffect(() => {
    if (!challenge) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !isVerifying) handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [challenge, isVerifying, handleCancel]);

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm it is you"
        >
          {/* No click-through dismiss. Every other dialog here closes on a
              backdrop click, but this one is answering "is this really you?"
              and a stray click beside the card should not be the answer. The
              Cancel button and Escape are the ways out. */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" />

          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6">
              {/* ONE heading, not two.
                  The form below can draw its own "Enter the 6-digit code"
                  block — that is what the sign-in screen uses — but here it
                  stacked a second title under this one and pushed the input
                  four sentences down the card. `renderHeader={false}` turns
                  it off and this header carries the whole explanation. */}
              <div className="flex items-start gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#AC2334]/10">
                  <Icon name="ShieldCheck" size={20} className="text-[#AC2334]" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 className="text-[17px] font-semibold leading-tight text-foreground">
                    Confirm it is you
                  </h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    This action needs a fresh verification code.
                  </p>
                </div>
              </div>

              {/* The server's message, VERBATIM. It names the channels that
                  were actually used — email, WhatsApp or both — and only the
                  gateway knows which, so composing our own would be wrong for
                  anyone not on email. The fallbacks are for a gateway that
                  sends no message at all. */}
              <p className="mb-5 mt-4 break-words text-[13px] leading-relaxed text-muted-foreground">
                {challenge.message ||
                  (challenge.mobileMasked && !challenge.emailMasked
                    ? `We sent a 6-digit code on WhatsApp to ${challenge.mobileMasked}.`
                    : "We sent a 6-digit verification code to your registered contact details.")}
              </p>

              <OtpStep
                renderHeader={false}
                issuedAt={challenge.issuedAt}
                clearAt={clearAt}
                ttlMs={STEP_UP_TTL_MS}
                error={error}
                isLoading={isVerifying}
                onVerify={handleVerify}
                onResend={handleResend}
                onBack={handleCancel}
                submitLabel="Verify"
                submitBusyLabel="Verifying…"
                resendLabel="Send a new code"
                backLabel="Cancel"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StepUpGate;
