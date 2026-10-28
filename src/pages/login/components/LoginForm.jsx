import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Icon from "../../../components/AppIcon";
import { SESSION_EXPIRED_KEY } from "services/session";

const LoginForm = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
//  https://test-gateway.aajneetiadvertising.com/auth   https://gateway.aajneetiadvertising.com/auth
    try {
      // 🔐 Step 1: create login token (username + password)
      const loginToken = btoa(`${formData.username}:${formData.password}`);

      const res = await fetch("https://gateway.aajneetiadvertising.com/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "create-token": loginToken,
        },
        //cross origin request  on crm 
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (!res.ok) {
        throw new Error(data?.message || "Invalid credentials");
      }
      //

      /* STEP 2: get logged in user */
      const user = data.user;

     
      const buildLoginObj = (u, rolesNamesMap) => ({
        id: u.id,
        username: u.userName,
        token: data.token,
        secret: data.secret,
        type: u.type,
        acl: data.acl || null,
        rolesIds: u.rolesIds || [],
        rolesNames: rolesNamesMap || {},
        roles: Object.values(rolesNamesMap || {}),
        role: Object.values(rolesNamesMap || {})?.[0] || "",
        teamsIds: u.teamsIds?.length
          ? u.teamsIds
          : u.teamIds?.length
            ? u.teamIds
            : u.defaultTeamId
              ? [u.defaultTeamId]
              : [],
        teamId: u.teamId || u.defaultTeamId || null,
        assignedUserId: u.id,
      });

      const wrappedToken = btoa(
        JSON.stringify(buildLoginObj(user, user.rolesNames)),
      );


      let enrichedUser = user;
      try {
        const userRes = await fetch(
          `https://gateway.aajneetiadvertising.com/User/${user.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: wrappedToken,
            },
          },
        );
        if (userRes.ok) {
          const full = await userRes.json();
          enrichedUser = { ...user, ...full };
        }
      } catch (err) {
        console.warn("Could not enrich user with role info:", err);
      }

      // 🔐 Step 2: create login object from response (with enriched roles)
      const loginObj = buildLoginObj(
        enrichedUser,
        enrichedUser.rolesNames || {},
      );

      // 🔐 Step 3: stringify + base64 encode
      const jsonString = JSON.stringify(loginObj);
      const myToken = btoa(jsonString);

      // ✅ Store everything.
      //
      // Guarded, because these four writes share one storage quota with every
      // cache the app keeps — and they were previously bare setItem calls.
      // When storage was full the writes threw PART WAY THROUGH, which is the
      // worst possible outcome: auth_token and login_object land, `acl` (the
      // largest of the four) does not, and the user is "logged in" with no
      // permissions at all. Every ACL-gated read then comes back empty and it
      // looks exactly like "my data is not loading".
      //
      // So: clear the app's own caches and retry once — they are all
      // re-derivable from the server — and only give up if that still fails,
      // with a message that names the real problem instead of a login error.
      const writeSession = () => {
        localStorage.setItem("auth_token", myToken);
        localStorage.setItem("login_object", jsonString);
        localStorage.setItem("isAuthenticated", "true");
        if (data.acl) {
          localStorage.setItem("acl", JSON.stringify(data.acl));
        }
      };

      try {
        writeSession();
      } catch {
        try {
          // Drop every cache we own, keeping nothing but what we are about to
          // write. Counts, teams, users and datasets all rebuild on demand.
          Object.keys(localStorage)
            .filter(
              (k) =>
                k.startsWith("leads_count_cache_") ||
                k.startsWith("users_cache_") ||
                k.startsWith("teams_cache_") ||
                k.startsWith("win_rate_dataset_") ||
                k.startsWith("project_options_"),
            )
            .forEach((k) => localStorage.removeItem(k));
          writeSession();
        } catch {
          setErrors({
            general:
              "Your browser storage is full, so the session could not be saved. Clear this site's data and try again.",
          });
          setIsLoading(false);
          return;
        }
      }

      try {
        sessionStorage.removeItem("dashboardSummaryAlertDismissed");
        sessionStorage.removeItem("dashboardSummaryAlertSoundPlayed");
      } catch {
        // sessionStorage unavailable — alert will just behave as if first-visit
      }

      // Back to whatever they were doing when the session died, else the
      // dashboard. `returnTo` is always a validated same-origin path.
      navigate(returnTo || "/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
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
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="you@aajneeti.social"
            autoComplete="username"
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
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Enter your password"
            autoComplete="current-password"
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
      <motion.div
        variants={item}
        className="flex items-center justify-between pt-1"
      >
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
        <a
          href="#"
          className="text-sm font-medium text-[#AC2334] transition-opacity hover:opacity-70"
        >
          Forgot password?
        </a>
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
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AC2334] py-3.5 text-sm font-semibold text-white shadow-md shadow-[#AC2334]/20 transition-colors hover:bg-[#961e2d] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? (
            <>
              <Icon name="Loader2" size={18} className="animate-spin" />
              Signing in…
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
