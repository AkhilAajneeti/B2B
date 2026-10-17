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

/* Fifteen drifting leaves, split between the two columns because each column
   has to carry its own layer — see LeafFall below. Nine on the hero, six on the
   form, roughly matching the 60/40 split so the density looks even across the
   page. `left` is a percentage OF ITS OWN COLUMN, not of the page.

   Hand-placed rather than generated: the spacing is uneven on purpose so they
   read as wind-blown, the delays spread to 1.5s so the last leaf still clears
   the viewport inside ~4.6s, and the sizes vary to fake depth. */
const HERO_LEAVES = [
  { left: "5%", delay: "0.8s", size: "w-4" },
  { left: "14%", delay: "0s", size: "w-5" },
  { left: "24%", delay: "1.25s", size: "w-6" },
  { left: "33%", delay: "0.35s", size: "w-7" },
  { left: "45%", delay: "1.6s", size: "w-4" },
  { left: "56%", delay: "0.6s", size: "w-5" },
  { left: "67%", delay: "1.05s", size: "w-6" },
  { left: "79%", delay: "0.2s", size: "w-4" },
  { left: "91%", delay: "1.45s", size: "w-6" },
];

const FORM_LEAVES = [
  { left: "7%", delay: "1.15s", size: "w-4" },
  { left: "21%", delay: "0.4s", size: "w-6" },
  { left: "38%", delay: "1.55s", size: "w-4" },
  { left: "54%", delay: "0.1s", size: "w-5" },
  { left: "71%", delay: "0.9s", size: "w-6" },
  { left: "88%", delay: "1.7s", size: "w-4" },
];

/* One run of falling leaves over whatever it is dropped into.

   This is a component rather than a single page-level layer because the hero's
   artwork is opaque: an absolutely-positioned layer on the page root is painted
   over by the hero's background image, so leaves only ever appeared on the form
   side. Each column therefore gets its own layer, stacked above that column's
   background but below its content.

   One ~3s run on mount, never a loop. The design is a still illustration, and
   permanent background motion on a page people are typing a password into is a
   distraction that also keeps a compositor layer alive for the life of the tab.
   Each leaf finishes at opacity 0; the layer is inert to hit-testing and hidden
   from assistive tech, and prefers-reduced-motion skips it in the stylesheet. */
const LeafFall = ({ leaves, className = "" }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
  >
    {leaves.map((leaf) => (
      <img
        key={leaf.left}
        src="/assets/images/festive-leaf.png"
        alt=""
        className={`festive-leaf-fall absolute top-0 ${leaf.size} select-none`}
        style={{ left: leaf.left, animationDelay: leaf.delay }}
      />
    ))}
  </div>
);

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

      <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-[60%_40%] bg-[#FDF5EA]">
        {/* ───────────────────────── LEFT · HERO ───────────────────────── */}
        <div
          onPointerMove={handlePointer}
          onPointerLeave={resetPointer}
          className="relative hidden lg:flex flex-col justify-between overflow-hidden px-14 pt-12 pb-[26%] text-slate-900"
        >
          {/* Festive artwork. Replaces the previous navy gradient stack
              (base + vignette + brand glow + aurora + masked grid + drifting
              orb + particle field) — all of that existed to give a dark panel
              depth, and none of it reads on a light, illustrated ground.

              object-left-bottom, NOT object-right. In the reference, Ram ji
              with the bow stands at the lower LEFT and the temples run along
              the right; the panel is narrower than the artwork, so something
              has to be cropped. Anchoring left keeps the archer — the one
              element the design is built around — and trims the far-right
              mandala, which the form card carries anyway.

              The file is -v2 because the previous name held a mirrored copy;
              browsers that already cached it would otherwise keep serving the
              flipped image however the markup changed. */}
          <img
            src="/assets/images/festive-login-v2.jpg"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full select-none object-cover object-left-bottom"
          />

          {/* Legibility scrims, vertical then horizontal. The copy occupies
              the TOP of the panel and the archer the bottom, so the wash is
              strongest above and clears completely below — a left-to-right
              scrim (what this was) washed the archer out instead. The second,
              much lighter pass keeps the headline readable where the artwork's
              sky brightens. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-[#FFF7EC] from-15% via-[#FFF7EC]/70 via-55% to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#FFF7EC]/70 via-[#FFF7EC]/20 to-transparent"
          />

          <LeafFall leaves={HERO_LEAVES} className="z-[5]" />

          {/* Logo */}
          <motion.img
            src="/assets/images/logo.webp"
            alt="AAJneeti"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 w-36"
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
              className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#AC2334]"
            >
              <span className="h-px w-8 bg-[#AC2334]/60" />
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
              <span className="font-semibold italic text-[#AC2334]">
                engineered end&nbsp;to&nbsp;end.
              </span>
            </motion.h1>

            <motion.p
              variants={{
                hidden: { opacity: 0, y: 18 },
                show: { opacity: 1, y: 0 },
              }}
              className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-600"
            >
              A CRM is only as powerful as the engine feeding it.{" "}
              <span className="font-semibold text-slate-900">
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
            <p className="mb-6 text-sm italic text-slate-500">
              Performance marketing, wired straight into your CRM.
            </p>

            <div className="relative flex items-start justify-between">
              {/* connector track — faint for most of its length, turning red
                  only near the Pipeline endpoint (last ~30%) */}
              <div className="absolute left-2 right-2 top-[7px] h-px -translate-y-1/2 bg-gradient-to-r from-[#AC2334]/40 via-[#AC2334]/60 to-[#AC2334]">
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
                      <span className="absolute inset-0 rounded-full bg-[#AC2334] shadow-[0_0_12px_3px_rgba(172,35,52,0.35)]" />
                    ) : (
                      <span className="absolute inset-0 rounded-full border-2 border-[#AC2334]/50 bg-white" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {node.label}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                    {node.meta}
                  </span>
                </div>
                );
              })}
            </div>

            <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-900/10 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ───────────────────────── RIGHT · FORM ───────────────────────── */}
        <div className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <LeafFall leaves={FORM_LEAVES} />

          {/* soft warm glow behind the card */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#F59E0B]/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#AC2334]/[0.06] blur-3xl" />

            {/* Top-right mandala arc with the hanging lantern and diya. This
                corner was the emptiest part of the page: the hero crop anchors
                left to keep the archer, which drops the ornament the reference
                puts here.

                Cut from the reference itself rather than redrawn, so the
                tracery matches exactly. Alpha came from the BLUE channel —
                the cream ground is high in blue and the gold line work is low
                in it, which separates them far more cleanly than luminance
                does on a warm-on-warm palette — then un-composited off the
                background so the gold keeps its own colour instead of
                carrying a cream haze. */}
            <img
              src="/assets/images/festive-corner-mandala.png"
              alt=""
              className="absolute -right-12 -top-8 w-64 select-none opacity-90 xl:w-80"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-full max-w-[420px]"
          >
            {/* Mobile-only branding card (the full hero is hidden < lg) —
                a compact navy panel with logo, eyebrow, and headline. */}
            <div className="relative mb-10 overflow-hidden rounded-2xl px-6 py-7 text-slate-900 shadow-[0_20px_40px_-24px_rgba(172,35,52,0.35)] lg:hidden">
              <img
                src="/assets/images/festive-login-v2.jpg"
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full select-none object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-[#FFF7EC] via-[#FFF7EC]/85 to-[#FFF7EC]/30"
              />
              <div className="relative z-10">
                <img
                  src="/assets/images/logo.webp"
                  alt="AAJneeti"
                  className="w-32"
                />
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#AC2334]">
                  Performance Marketing × CRM
                </p>
                <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
                  India&apos;s strongest sales pipeline, in one place.
                </h1>
              </div>
            </div>

            {/* White card on the cream ground — the reference lifts the form
                off the page rather than letting it sit flat on it. */}
            <div className="relative overflow-hidden rounded-2xl border border-[#F1DFC6] bg-[#FCFAF6] p-7 shadow-[0_24px_60px_-28px_rgba(172,35,52,0.35)] sm:p-8">
              {/* Mandala bleeding off the bottom-right, cropped from the
                  supplied artwork. The card clips it, which is how it reads in
                  the reference: the ornament passes behind the panel rather
                  than sitting beside it. The lanterns that hung here moved out
                  to the page's top-right corner piece. */}
              <img
                src="/assets/images/festive-mandala-full.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -right-16 w-44 select-none opacity-30"
              />
              {/* Drifting leaves, as scattered in the design. Three only —
                  the reference uses them as punctuation, not texture. */}
              <img
                src="/assets/images/festive-leaf.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute left-[42%] top-6 w-5 -rotate-12 select-none opacity-80"
              />
              <img
                src="/assets/images/festive-leaf.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute right-6 top-[62%] w-5 rotate-45 select-none opacity-80"
              />
              <img
                src="/assets/images/festive-leaf.png"
                alt=""
                aria-hidden
                className="pointer-events-none absolute bottom-10 left-6 w-5 -rotate-45 select-none opacity-80"
              />
              <div className="relative">
                <LoginHeader />
                <LoginForm />

                {/* Inside the card, under a rule — the reference keeps the
                    copyright within the card, not floating beneath it. */}
                <div className="mt-7 border-t border-[#EFE3D2] pt-4">
                  <p className="text-xs text-slate-400">
                    © {new Date().getFullYear()} AAJneeti Connect Limited. All
                    rights reserved.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
