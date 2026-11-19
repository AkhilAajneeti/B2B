import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";

/**
 * Step 2 of sign-in: the 6-digit email OTP.
 *
 * Styling deliberately mirrors LoginForm's — same input radius, same
 * `#AC2334` focus ring, same submit button in both default and festive
 * variants — because this is the same form at a later step, not a separate
 * screen. A different look here would read as a third-party page asking for a
 * code, which is exactly the shape of a phishing prompt.
 */

const OTP_LENGTH = 6;

/** 15 minutes, matching the gateway's OTP lifetime. */
const OTP_TTL_MS = 15 * 60 * 1000;

/** How long before "Resend code" becomes available again. */
const RESEND_COOLDOWN_S = 30;

const formatCountdown = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const OtpStep = ({
  emailMasked,
  message,
  onVerify,
  onResend,
  onBack,
  isLoading,
  error,
  // Remounts the countdown when a resend issues a fresh code.
  issuedAt,
  festive = false,
}) => {
  const [digits, setDigits] = useState(() => Array(OTP_LENGTH).fill(""));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [remaining, setRemaining] = useState(OTP_TTL_MS);
  const [resending, setResending] = useState(false);

  const inputsRef = useRef([]);
  const code = digits.join("");
  const complete = code.length === OTP_LENGTH;

  // Autofocus the first box. Without this the person has to click into a
  // 6-box row before typing, which on mobile also means the keyboard does not
  // appear until a second tap.
  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // A fresh code invalidates whatever was typed against the previous one —
  // leaving the old digits on screen would let them submit a code that is
  // guaranteed to fail.
  useEffect(() => {
    setDigits(Array(OTP_LENGTH).fill(""));
    setCooldown(RESEND_COOLDOWN_S);
    setRemaining(OTP_TTL_MS);
    inputsRef.current[0]?.focus();
  }, [issuedAt]);

  // Expiry countdown. Driven from a deadline rather than by decrementing a
  // counter, because a background tab throttles timers and a decrementing
  // counter would drift far behind real time.
  useEffect(() => {
    const deadline = issuedAt + OTP_TTL_MS;
    const tick = () => setRemaining(deadline - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [issuedAt]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const expired = remaining <= 0;

  const setDigitAt = useCallback((index, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  /** Spreads a pasted or autofilled code across the boxes. */
  const fill = useCallback((raw, startIndex = 0) => {
    const chars = String(raw).replace(/\D/g, "").slice(0, OTP_LENGTH - startIndex);
    if (!chars) return;

    setDigits((prev) => {
      const next = [...prev];
      chars.split("").forEach((c, i) => {
        next[startIndex + i] = c;
      });
      return next;
    });

    const landed = Math.min(startIndex + chars.length, OTP_LENGTH - 1);
    inputsRef.current[landed]?.focus();
  }, []);

  const handleChange = (index) => (e) => {
    const raw = e.target.value;

    // More than one character means a paste, or an SMS/email autofill
    // delivering the whole code into a single box. Treating it as one digit
    // would silently drop five of them.
    if (raw.length > 1) {
      fill(raw, index);
      return;
    }

    const digit = raw.replace(/\D/g, "");
    setDigitAt(index, digit);
    if (digit && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index) => (e) => {
    if (e.key === "Backspace") {
      // Backspace on an empty box steps back and clears the previous one,
      // which is what every OTP input does and what the hand expects.
      if (!digits[index] && index > 0) {
        e.preventDefault();
        setDigitAt(index - 1, "");
        inputsRef.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (index) => (e) => {
    const text = e.clipboardData?.getData("text");
    if (!text) return;
    e.preventDefault();
    fill(text, index);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!complete || isLoading || expired) return;
    onVerify(code);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  const container = useMemo(
    () => ({ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }),
    [],
  );
  const item = useMemo(
    () => ({ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }),
    [],
  );

  const boxClass = (filled, hasError) =>
    `login-input h-13 w-full rounded-xl border bg-white text-center text-xl font-semibold text-slate-900 shadow-sm outline-none transition-all duration-200 focus:ring-4 disabled:opacity-60 ${
      hasError
        ? "!border-red-300 focus:!border-red-400 focus:ring-red-500/10"
        : filled
          ? "!border-[#AC2334]/60 focus:!border-[#AC2334] focus:ring-[#AC2334]/10"
          : "!border-[#D5CFC8] focus:!border-[#AC2334] focus:ring-[#AC2334]/10"
    }`;

  return (
    <motion.form
      onSubmit={submit}
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
      noValidate
    >
      {/* Where the code went. Shown so the person can tell at a glance whether
          it was sent to an address they can actually open — and so a wrong
          address is diagnosable without contacting support. */}
      <motion.div variants={item} className="space-y-2">
        <div className="flex items-start gap-2.5 rounded-xl border border-[#E6DFD6] bg-[#FBF8F4] p-3.5">
          <Icon name="MailCheck" size={18} className="mt-0.5 shrink-0 text-[#AC2334]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              Enter the 6-digit code
            </p>
            <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-600">
              {emailMasked ? (
                <>
                  Sent to <span className="font-medium text-slate-800">{emailMasked}</span>.
                  Check your spam folder if it has not arrived.
                </>
              ) : (
                message || "We sent a verification code to your registered email address."
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5"
        >
          <Icon name="AlertCircle" size={16} className="shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      {/* The boxes. `inputMode="numeric"` brings up the number pad on mobile,
          and `autoComplete="one-time-code"` lets iOS and Android offer the
          code straight from the notification. */}
      <motion.div variants={item}>
        <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
              maxLength={OTP_LENGTH}
              value={digit}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              onPaste={handlePaste(i)}
              onFocus={(e) => e.target.select()}
              disabled={isLoading || expired}
              className={boxClass(Boolean(digit), Boolean(error))}
              style={{ paddingTop: "0.7rem", paddingBottom: "0.7rem" }}
            />
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3 text-xs">
          {expired ? (
            <span className="font-medium text-red-600">
              This code has expired — request a new one.
            </span>
          ) : (
            <span className="text-slate-500">
              Expires in{" "}
              <span className="font-semibold tabular-nums text-slate-700">
                {formatCountdown(remaining)}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending || isLoading}
            className="shrink-0 font-semibold text-[#AC2334] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
          </button>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <motion.button
          type="submit"
          disabled={!complete || isLoading || expired}
          aria-busy={isLoading}
          whileHover={!complete || isLoading ? undefined : { scale: 1.005 }}
          whileTap={!complete || isLoading ? undefined : { scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={
            festive
              ? "flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#8E1B2B] via-[#A81F32] to-[#7E1626] py-4 text-base font-semibold text-white shadow-lg shadow-[#8E1B2B]/25 transition-shadow hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              : "flex w-full items-center justify-center gap-2 rounded-xl bg-[#AC2334] py-3.5 text-sm font-semibold text-white shadow-md shadow-[#AC2334]/20 transition-colors hover:bg-[#961e2d] disabled:cursor-not-allowed disabled:opacity-70"
          }
        >
          {isLoading ? (
            <>
              <Icon name="Loader2" size={18} className="animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <Icon name="ShieldCheck" size={16} />
              Verify &amp; sign in
            </>
          )}
        </motion.button>
      </motion.div>

      <motion.div variants={item} className="text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-60"
        >
          <Icon name="ArrowLeft" size={14} />
          Use a different account
        </button>
      </motion.div>
    </motion.form>
  );
};

export default OtpStep;
