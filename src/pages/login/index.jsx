import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import LoginHeader from "./components/LoginHeader";
import LoginForm from "./components/LoginForm";

/* Pipeline stepper nodes shown at the bottom of the hero. `active` nodes
   render the glowing crimson dot; the rest are hollow. */
const PIPELINE = [
  { label: "Campaigns", meta: "META · GOOGLE", active: false },
  { label: "Leads", meta: "CAPTURED LIVE", active: true },
  { label: "Qualified", meta: "40–80% GUARANTEED", active: false },
  { label: "Pipeline", meta: "ROUTED & CLOSED", active: true },
];

const STATS = [
  { value: "10M+", label: "Leads delivered" },
  { value: "40–80%", label: "Qualified, guaranteed" },
  { value: "2014", label: "Building pipelines since" },
];

/* Deterministic particle field — no Math.random so positions are stable
   across renders. Each drifts vertically on its own cadence. */
const PARTICLES = [
  { left: "12%", top: "22%", size: 5, delay: 0, duration: 7 },
  { left: "28%", top: "68%", size: 3, delay: 1.2, duration: 9 },
  { left: "46%", top: "34%", size: 4, delay: 0.6, duration: 8 },
  { left: "63%", top: "18%", size: 3, delay: 2, duration: 10 },
  { left: "74%", top: "58%", size: 6, delay: 0.3, duration: 7.5 },
  { left: "88%", top: "40%", size: 4, delay: 1.6, duration: 9.5 },
  { left: "18%", top: "82%", size: 3, delay: 2.4, duration: 8.5 },
  { left: "55%", top: "78%", size: 4, delay: 0.9, duration: 11 },
];

const LoginPage = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const raw = localStorage.getItem("login_object");
    let hasUser = false;
    try {
      hasUser = Boolean(raw && JSON.parse(raw)?.id);
    } catch {
      hasUser = false;
    }
    if (token && hasUser) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  /* Pointer-driven parallax. We track a normalized -0.5..0.5 offset and
     spring it, then derive per-layer transforms at different depths so the
     glow, floating cards, and grid drift at different rates. */
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  const glowX = useTransform(sx, [-0.5, 0.5], [34, -34]);
  const glowY = useTransform(sy, [-0.5, 0.5], [34, -34]);

  const handlePointer = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };

  const resetPointer = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <>
      <Helmet>
        <title>Sign In - CRM</title>
        <meta
          name="description"
          content="Sign in to your Aajneeti CRM account to access your sales pipeline, customer data, and CRM tools."
        />
      </Helmet>

      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[60%_40%] bg-[#f6f2ea]">
        {/* ───────────────────────── LEFT · HERO ───────────────────────── */}
        <div
          onPointerMove={handlePointer}
          onPointerLeave={resetPointer}
          className="relative hidden lg:flex flex-col justify-between overflow-hidden px-14 py-12 text-white"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#1f3b69_0%,#122140_50%,#0a1220_100%)]" />

          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom_right,transparent_40%,rgba(5,9,18,0.85)_100%)]"
          />

          {/* Brand red gradient anchored to the bottom-right corner */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(55%_50%_at_100%_100%,rgba(172,35,52,0.3),rgba(172,35,52,0.18)_55%,transparent_100%)]"
          />

          {/* Slow-panning aurora sheen */}
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-60 mix-blend-screen"
            style={{
              backgroundImage:
                "radial-gradient(50% 55% at 90% 92%, rgba(172,35,52,0.28), transparent 65%)",
              backgroundSize: "200% 200%",
            }}
            animate={
              reduce
                ? undefined
                : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
            }
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Grid — vertical columns; masked so it stays clear behind the
              content on the left and fades in across the right side */}
          <div
            aria-hidden
            className="absolute -inset-8 bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:72px_100%] [mask-image:linear-gradient(to_right,transparent_45%,black_72%)]"
          />

          {/* Drifting glow orb (parallax) — brand red, bottom-right only */}
          <motion.div
            aria-hidden
            style={{ x: glowY, y: glowX }}
            className="absolute bottom-[-120px] right-[-80px] h-[380px] w-[380px] rounded-full bg-[#AC2334]/18 blur-3xl"
          />

          {/* Glowing particles */}
          {!reduce &&
            PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute rounded-full bg-white/70 shadow-[0_0_12px_2px_rgba(255,255,255,0.45)]"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                }}
                animate={{ y: [0, -18, 0], opacity: [0.25, 0.9, 0.25] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}

          {/* Logo */}
          <motion.img
            src="/assets/images/aajneeti-logo.png"
            alt="AAJneeti"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 w-32 rounded-md"
          />

          {/* Headline block */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
            }}
            className="relative z-10 max-w-lg"
          >
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0 },
              }}
              className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#d13b4a]"
            >
              <span className="h-px w-8 bg-[#d13b4a]/70" />
              Performance Marketing × CRM
            </motion.p>

            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
              className="text-5xl font-bold leading-[1.05] tracking-tight"
            >
              India&apos;s strongest
              <br />
              sales pipeline,
              <br />
              <span className="font-medium italic text-[#F3D8DC]">
                engineered end&nbsp;to&nbsp;end.
              </span>
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
              className="mt-6 max-w-md text-[15px] leading-relaxed text-white/70"
            >
              A CRM is only as powerful as the engine feeding it.{" "}
              <span className="font-semibold text-white">
                AAJneeti Connect Limited
              </span>{" "}
              builds both — the campaigns that capture demand and the pipeline
              that converts it — as one continuous system.
            </motion.p>
          </motion.div>

          {/* Pipeline stepper + stats */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="relative z-10"
          >
            <p className="mb-6 text-sm italic text-white/45">
              Performance marketing, wired straight into your CRM.
            </p>

            <div className="relative flex items-start justify-between">
              {/* connector track — faint for most of its length, turning red
                  only near the Pipeline endpoint (last ~30%) */}
              <div className="absolute left-2 right-2 top-[7px] h-px -translate-y-1/2 bg-gradient-to-r from-white/15 from-70% to-[#e11d48]/90">
                {!reduce && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2"
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 1, 0] }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 0.4,
                    }}
                  >
                    {/* comet tail */}
                    <span className="absolute right-0 top-1/2 h-[2px] w-12 -translate-y-1/2 rounded-full bg-gradient-to-l from-[#f43f5e]/50 to-transparent" />
                    {/* glowing head */}
                    <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f43f5da4] shadow-[0_0_14px_4px_rgba(244,63,94,0.6)]" />
                  </motion.span>
                )}
              </div>

              {PIPELINE.map((node, i) => {
                const isLast = i === PIPELINE.length - 1;
                return (
                <div
                  key={node.label}
                  className="relative flex flex-1 flex-col items-center text-center first:items-start last:items-end"
                >
                  <span className="relative mb-3 block h-3.5 w-3.5">
                    {isLast ? (
                      <span className="absolute inset-0 rounded-full bg-[#e11d48] shadow-[0_0_12px_3px_rgba(225,29,72,0.6)]" />
                    ) : (
                      <span className="absolute inset-0 rounded-full border border-white/40 bg-[#0d1631]" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {node.label}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wider text-white/45">
                    {node.meta}
                  </span>
                </div>
                );
              })}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                  <p className="mt-1 text-xs text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ───────────────────────── RIGHT · FORM ───────────────────────── */}
        <div className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          {/* soft warm glow behind the card */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#AC2334]/5 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-indigo-500/5 blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-full max-w-[420px]"
          >
            {/* Mobile-only branding card (the full hero is hidden < lg) —
                a compact navy panel with logo, eyebrow, and headline. */}
            <div className="relative mb-10 overflow-hidden rounded-2xl px-6 py-7 text-white shadow-[0_20px_40px_-20px_rgba(15,23,42,0.4)] lg:hidden">
              <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_20%_0%,#183156_0%,#0c1c38_55%,#0a1730_100%)]" />
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(60%_60%_at_100%_100%,rgba(172,35,52,0.35),transparent_65%)]"
              />
              <div className="relative z-10">
                <img
                  src="/assets/images/aajneeti-logo.png"
                  alt="AAJneeti"
                  className="w-28 rounded-md"
                />
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d13b4a]">
                  Performance Marketing × CRM
                </p>
                <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
                  India&apos;s strongest sales pipeline, in one place.
                </h1>
              </div>
            </div>

            <div>
              <LoginHeader />
              <LoginForm />
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6">
              <p className="text-xs text-slate-400">
                © {new Date().getFullYear()} AAJneeti Connect Limited. All rights
                reserved.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
