import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import { SESSION_EXPIRED_KEY } from "services/session";
import {
  LOGIN_RESULT,
  buildLoginObject,
  enrichUser,
  initiateLogin,
  loadSessionUser,
  persistSession,
  resendOtp,
  verifyOtp,
} from "services/auth.service";
import { setSessionGateway } from "services/apiBase";
import OtpStep from "./OtpStep";

/** Where a pending OTP challenge is parked so a refresh does not lose it. */
const PENDING_CHALLENGE_KEY = "pendingChallenge";

/** Matches the gateway's 15-minute OTP lifetime. */
const CHALLENGE_TTL_MS = 15 * 60 * 1000;

/**
 * `variant="festive"` matches the Diwali sign-in mockup: a gradient submit
 * with a leading arrow disc. The default keeps the navy page exactly as it
 * was, so the seasonal styling cannot leak into it when the festive flag is
 * switched off.
 */
const LoginForm = ({ variant = "default" }) => {
  const festive = variant === "festive";
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // A pending OTP challenge, or null while on the credentials step. Holding
  // the whole challenge in one piece of state keeps the token, the masked
  // address and the issue time from ever drifting out of sync — a stale
  // challengeToken paired with a fresh countdown would show a live timer over
  // a code the gateway has already invalidated.
  const [challenge, setChallenge] = useState(null);
  const [otpError, setOtpError] = useState("");

  // Where to return after signing in. Set only when we arrived here because a
  // session expired mid-work; otherwise sign-in goes to the dashboard.
  const [returnTo, setReturnTo] = useState("");

  // Explain an involuntary logout. Without this the person is dropped on a
  // login screen with no reason given, which reads as the app having crashed —
  // and they land back on the dashboard afterwards, having lost the lead they
  // had open and the filters they had set.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_EXPIRED_KEY);
      if (!raw) return;
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);

      const { at, from } = JSON.parse(raw) || {};
      // Ignore a stale marker — a tab left open for hours should not claim the
      // session "just" expired.
      if (!at || Date.now() - at > 10 * 60 * 1000) return;

      setErrors({ general: "Your session expired. Please sign in again." });
      if (from) setReturnTo(from);
    } catch {
      /* sessionStorage unavailable — fall back to a plain login screen */
    }
  }, []);

  // Restore a pending OTP challenge after an accidental refresh. Without
  // this, F5 on the OTP screen drops the challenge token, and the code
  // already sitting in the person's inbox becomes unusable — they have to
  // sign in again and wait for a second email.
  //
  // Anything past the gateway's 15-minute window is discarded rather than
  // restored: showing an expired code's screen would only produce a failed
  // verify.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_CHALLENGE_KEY);
      if (!raw) return;

      const saved = JSON.parse(raw) || {};
      const fresh =
        saved.challengeToken &&
        saved.issuedAt &&
        Date.now() - saved.issuedAt < CHALLENGE_TTL_MS;

      if (fresh) {
        setChallenge(saved);
      } else {
        sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
      }
    } catch {
      /* unreadable or storage disabled — start from the credentials step */
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const isAuthenticated = localStorage.getItem("isAuthenticated");

    if (token && isAuthenticated === "true") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 4) {
      newErrors.password = "Password must be at least 5 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Commits a session and leaves the login screen.
   *
   * Shared end point for BOTH flows so that localStorage ends up identical
   * either way — same `login_object` shape, same `acl`, same quota handling.
   * A difference here would mean role gating or the `aajneeti` contact masking
   * behaving differently depending on which gateway signed you in.
   */
  const commitSession = ({ headerToken, loginObject, acl, gateway }) => {
    // Pin the session to the gateway that issued it BEFORE the token is
    // stored: its token is valid nowhere else, so a request to any other
    // gateway would 401 and bounce straight back to this screen.
    const gatewayChanged = gateway ? setSessionGateway(gateway) : false;

    const stored = persistSession({ token: headerToken, loginObject, acl });
    if (!stored) {
      setErrors({
        general:
          "Your browser storage is full, so the session could not be saved. Clear this site's data and try again.",
      });
      return false;
    }

    try {
      sessionStorage.removeItem("dashboardSummaryAlertDismissed");
      sessionStorage.removeItem("dashboardSummaryAlertSoundPlayed");
      sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
    } catch {
      // sessionStorage unavailable — alert will just behave as if first-visit
    }

    const destination = returnTo || "/dashboard";

    // A changed gateway needs a FULL page load, not a react-router navigate.
    // `API_BASE_URL` is resolved once when the module is imported, so after a
    // soft navigate every service would keep calling the gateway this tab
    // opened with — the one that did NOT issue this token — and 401 on the
    // first request.
    if (gatewayChanged) {
      window.location.assign(destination);
      return true;
    }

    // Back to whatever they were doing when the session died, else the
    // dashboard. `returnTo` is always a validated same-origin path.
    navigate(destination);
    return true;
  };

  /**
   * Legacy gateway: `/auth` already returned the Espo token and user.
   *
   * KEPT EXACTLY AS IT WAS, including the detail that what lands in
   * `auth_token` is `btoa(JSON.stringify(loginObject))` — the base64 wrapper
   * carrying the token AND secret — not the raw Espo token. Every service
   * forwards that wrapper as the `token` header. Storing the bare token here
   * instead would log everyone out of the production gateway.
   */
  const finishLegacyLogin = async ({ token, secret, user, acl, gateway }) => {
    const provisional = buildLoginObject({ user, acl, token, secret });
    const provisionalHeader = btoa(JSON.stringify(provisional));

    // Roles come from a second call; see enrichUser.
    const enriched = await enrichUser(user, provisionalHeader, gateway);

    const loginObject = buildLoginObject({ user: enriched, acl, token, secret });
    return commitSession({
      headerToken: btoa(JSON.stringify(loginObject)),
      loginObject,
      acl,
      gateway,
    });
  };

  /**
   * 2FA gateway: we hold a verified session token and nothing else, so the
   * user and ACL have to be fetched before we can let anyone in.
   */
  const finishTwoFactorLogin = async (sessionToken, gateway) => {
    const { user, acl } = await loadSessionUser(sessionToken, gateway);
    const enriched = await enrichUser(user, sessionToken, gateway);

    const loginObject = buildLoginObject({
      user: enriched,
      acl,
      token: sessionToken,
    });
    return commitSession({ headerToken: sessionToken, loginObject, acl, gateway });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    // Gateway host comes from VITE_API_BASE_URL via services/apiBase —
    // set it to the test gateway to exercise the 2FA flow. See that module.
    try {
      const outcome = await initiateLogin(formData.username, formData.password);

      // 2FA gateway — credentials were accepted and a code is in the post.
      if (outcome.result === LOGIN_RESULT.OTP_REQUIRED) {
        const challenge = {
          challengeToken: outcome.challengeToken,
          emailMasked: outcome.emailMasked,
          message: outcome.message,
          gateway: outcome.gateway,
          issuedAt: Date.now(),
        };
        setChallenge(challenge);
        setOtpError("");
        // Survives an accidental refresh on the OTP screen, which would
        // otherwise throw the code away and force a fresh login.
        try {
          sessionStorage.setItem(PENDING_CHALLENGE_KEY, JSON.stringify(challenge));
        } catch {
          /* storage disabled — the flow still works, just not across a refresh */
        }
        setIsLoading(false);
        return;
      }

      // Legacy gateway — already authenticated.
      await finishLegacyLogin(outcome);
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (code) => {
    setIsLoading(true);
    setOtpError("");
    try {
      const sessionToken = await verifyOtp(code, challenge.challengeToken);
      await finishTwoFactorLogin(sessionToken, challenge.gateway);
    } catch (err) {
      console.error("OTP verification error:", err);
      setOtpError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const next = await resendOtp(challenge.challengeToken);
      // The previous challenge token stops working the moment a new code is
      // issued, so this replacement is mandatory, not an optimisation.
      const challenge2 = {
        challengeToken: next.challengeToken,
        emailMasked: next.emailMasked || challenge.emailMasked,
        message: next.message,
        gateway: challenge.gateway,
        issuedAt: Date.now(),
      };
      setChallenge(challenge2);
      setOtpError("");
      try {
        sessionStorage.setItem(PENDING_CHALLENGE_KEY, JSON.stringify(challenge2));
      } catch {
        /* storage disabled */
      }
    } catch (err) {
      console.error("OTP resend error:", err);
      setOtpError(err.message);
    }
  };

  /** Abandons the pending code and returns to the username/password step. */
  const handleBackToCredentials = () => {
    setChallenge(null);
    setOtpError("");
    setErrors({});
    setFormData((prev) => ({ ...prev, password: "" }));
    try {
      sessionStorage.removeItem(PENDING_CHALLENGE_KEY);
    } catch {
      /* storage disabled */
    }
  };

  /* Label sits above the field; plain white rounded input with a subtle
     border and a brand-tinted focus ring. */
  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-800";

  // NOTE: a global rule in index.css forces `input { border-color: green
  // !important }`, so the login border colors need the `!` important prefix
  // to win on specificity.
  const inputClass = (hasError) =>
    `login-input w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all duration-200 focus:ring-4 disabled:opacity-60 ${
      hasError
        ? "!border-red-300 focus:!border-red-400 focus:ring-red-500/10"
        : "!border-[#D5CFC8] focus:!border-[#AC2334] focus:ring-[#AC2334]/10"
    }`;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  // Step 2. Rendered in place of the credentials form rather than over it as
  // a modal: a dialog floating above a still-filled password field invites
  // the person to dismiss it and retry, which would silently invalidate the
  // code they were just sent.
  if (challenge) {
    return (
      <OtpStep
        emailMasked={challenge.emailMasked}
        message={challenge.message}
        issuedAt={challenge.issuedAt}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onBack={handleBackToCredentials}
        isLoading={isLoading}
        error={otpError}
        festive={festive}
      />
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
      noValidate
    >
      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5"
        >
          <Icon name="AlertCircle" size={16} className="text-red-500" />
          <p className="text-sm text-red-700">{errors.general}</p>
        </motion.div>
      )}

      {/* Username */}
      <motion.div variants={item}>
        <label htmlFor="username" className={labelClass}>
          Username <span className="text-[#AC2334]">*</span>
        </label>
        {/* Leading icons on both fields, as in the design. Wrapped in a
            relative box and marked pointer-events-none so clicking the icon
            still focuses the input underneath it. */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="User" size={18} />
          </span>
          {/* MOBILE KEYBOARDS EDIT WHAT YOU TYPE unless told not to. iOS and
              Android capitalise the first letter of a text field by default,
              so "ravindragaur" is submitted as "Ravindragaur" and a
              case-sensitive backend answers invalid credentials; autocorrect
              can rewrite it outright. Pasting bypasses the keyboard, which is
              why that always worked. */}
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="you@aajneeti.social"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!errors.username}
            aria-describedby={errors.username ? "username-error" : undefined}
            className={`${inputClass(!!errors.username)} pl-11`}
          />
        </div>
        {errors.username && (
          <p id="username-error" className="mt-1.5 text-xs text-red-600">
            {errors.username}
          </p>
        )}
      </motion.div>

      {/* Password */}
      <motion.div variants={item}>
        <label htmlFor="password" className={labelClass}>
          Password <span className="text-[#AC2334]">*</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon name="Lock" size={18} />
          </span>
          {/* Same guard. A password field is normally exempt, but this one
              flips to type="text" when the eye is tapped, and in text mode
              the keyboard capitalises and autocorrects like any other. */}
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your password"
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`${inputClass(!!errors.password)} pl-11 pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#AC2334]"
          >
            <Icon name={showPassword ? "EyeOff" : "Eye"} size={18} />
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs text-red-600">
            {errors.password}
          </p>
        )}
      </motion.div>

      {/* Remember + forgot */}
      <motion.div variants={item} className="flex items-center pt-1">
        <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm text-slate-600">
          {/* Native checkbox is visually hidden (the forms plugin forces
              appearance:none, which ignores accent-color); we render a fully
              brand-controlled box driven by state instead. */}
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleInputChange}
            disabled={isLoading}
            className="peer sr-only"
          />
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#AC2334]/40 peer-focus-visible:ring-offset-1 ${
              formData.rememberMe
                ? "border-[#AC2334] bg-[#AC2334]"
                : "border-[#C9BFB4] bg-white"
            }`}
          >
            {formData.rememberMe && (
              <Icon name="Check" size={12} strokeWidth={3} className="text-white" />
            )}
          </span>
          Keep me signed in
        </label>
      </motion.div>

      {/* Submit */}
      <motion.div variants={item}>
        <motion.button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          whileHover={isLoading ? undefined : { scale: 1.005 }}
          whileTap={isLoading ? undefined : { scale: 0.99 }}
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
              Signing in…
            </>
          ) : festive ? (
            <>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                <Icon name="ArrowRight" size={16} />
              </span>
              Sign In
            </>
          ) : (
            "Sign in"
          )}
        </motion.button>
      </motion.div>
    </motion.form>
  );
};

export default LoginForm;
