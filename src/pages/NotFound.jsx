import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Icon from "components/AppIcon";

/**
 * Motion for this screen.
 *
 * Kept as a plain <style> block rather than Tailwind keyframes on purpose:
 * every one of these is used by this page and nothing else, so putting them in
 * tailwind.config.js would ship them to every other bundle for no reason and
 * make them look like shared primitives that other screens may rely on.
 *
 * Everything here is SLOW (3-6s) and small (a few pixels). This is a dead end,
 * not a celebration - the motion is there to make the page feel alive and
 * unhurried while someone decides where to go, not to entertain them. Nothing
 * loops fast enough to pull the eye away from the two buttons.
 *
 * The last rule is not optional politeness: people who set "reduce motion" at
 * OS level often do so because movement makes them ill, and an endlessly
 * looping animation is exactly the kind that does it.
 */
const motionStyles = `
  @keyframes nf-bob {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-5px); }
  }
  @keyframes nf-halo {
    0%        { transform: scale(1);   opacity: 0.45; }
    70%, 100% { transform: scale(2.1); opacity: 0; }
  }
  /* Dashes travel UP the wire: the request leaving this browser, going off to
     ask for a page that isn't there. Direction matters - downward would read
     as something arriving, which is the opposite of what happened. */
  @keyframes nf-wire {
    to { stroke-dashoffset: -16; }
  }
  /* The outline keeps redrawing itself and never resolves into a real page. */
  @keyframes nf-outline {
    to { stroke-dashoffset: -40; }
  }
  @keyframes nf-drift {
    0%, 100% { transform: translate(0, 0);      opacity: 0.9; }
    50%      { transform: translate(2px, -7px); opacity: 0.45; }
  }
  @keyframes nf-shimmer {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
  @keyframes nf-rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .nf-rise { opacity: 0; animation: nf-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }

  /* transform-box/origin: without these an SVG element rotates or scales
     around the viewBox origin rather than around itself, which throws the
     halo and the bob clean off the artwork. */
  .nf-art [class^="nf-a-"] { transform-box: fill-box; transform-origin: center; }

  .nf-a-char    { animation: nf-bob 3.4s ease-in-out infinite; }
  .nf-a-halo    { animation: nf-halo 3.4s ease-out infinite; }
  .nf-a-wire    { animation: nf-wire 1.5s linear infinite; }
  .nf-a-outline { animation: nf-outline 6s linear infinite; }
  .nf-a-dot     { animation: nf-drift 5.5s ease-in-out infinite; }
  .nf-a-bar     { animation: nf-shimmer 2.8s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .nf-rise { opacity: 1; animation: none; }
    .nf-art * { animation: none !important; }
  }
`;

/**
 * Illustration for the 404 screen.
 *
 * Drawn inline as SVG for the same reasons as the one in ErrorBoundary: no
 * licence, no network request, sharp at any size - and, here, because it means
 * the whole thing can be animated with CSS instead of shipping a GIF or a
 * Lottie runtime onto a page whose entire job is to load instantly.
 *
 * It reuses that illustration's STRUCTURE - something at the top, a dashed
 * link down the middle, this browser window at the bottom - so the two "this
 * didn't work" screens read as one family. What changes is the story:
 *
 *   ErrorBoundary:  cloud (the server) ... link BROKEN (x) ... browser
 *   NotFound:       empty dashed outline (no page) ... link ASKING (?) ... browser
 *
 * There, the connection failed; here, the connection is fine and there is
 * simply nothing at the other end. That distinction is the whole point - a 404
 * is not a fault, and the artwork should not imply one.
 *
 * The "?" is the closest thing this page has to a character: it bobs, and a
 * halo pulses out of it on the same 3.4s beat, so it reads as something
 * actively looking rather than a static icon.
 */
const MissingPageArt = () => {
  const accent = "#AC2334"; // brand
  const faint = "#E2E8F0"; // slate-200

  // Staggered so the dots never pulse in unison - synchronised confetti reads
  // as a machine, offset confetti reads as air.
  const confetti = [
    { cx: 80, cy: 38, r: 4, fill: "#FBD9DC", delay: "0s" },
    { cx: 243, cy: 26, r: 6, fill: "#FBD9DC", delay: "1.4s" },
    { cx: 259, cy: 98, r: 3.5, fill: "#E2E8F0", delay: "0.7s" },
    { cx: 64, cy: 112, r: 5, fill: "#E2E8F0", delay: "2.1s" },
    { cx: 232, cy: 156, r: 4, fill: "#FBD9DC", delay: "2.8s" },
    { cx: 58, cy: 70, r: 2.5, fill: "#FBD9DC", delay: "3.5s" },
  ];

  return (
    <svg
      viewBox="0 0 320 180"
      className="nf-art w-full max-w-[280px] h-auto mx-auto overflow-visible"
      role="img"
      aria-label="Illustration: the page being looked for does not exist"
    >
      {confetti.map((c, i) => (
        <circle
          key={i}
          className="nf-a-dot"
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill={c.fill}
          style={{ animationDelay: c.delay }}
        />
      ))}

      {/* The page that is not there. An OUTLINE only - dashed, with its
          content lines unfilled, and the dash pattern crawling so it never
          settles into a finished page. Nothing is torn, cracked or crossed
          out, because nothing is actually wrong. */}
      <g>
        <rect
          className="nf-a-outline"
          x="132"
          y="16"
          width="60"
          height="54"
          rx="9"
          fill="#FFFFFF"
          stroke={accent}
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        <rect
          className="nf-a-bar"
          x="144"
          y="32"
          width="36"
          height="5"
          rx="2.5"
          fill={faint}
        />
        <rect
          className="nf-a-bar"
          x="144"
          y="43"
          width="26"
          height="5"
          rx="2.5"
          fill={faint}
          style={{ animationDelay: "0.35s" }}
        />
        <rect
          className="nf-a-bar"
          x="144"
          y="54"
          width="31"
          height="5"
          rx="2.5"
          fill={faint}
          style={{ animationDelay: "0.7s" }}
        />
      </g>

      {/* The wire. Intact on both sides of the marker - unlike the error
          screen, where the gap IS the message. Here the request went out and
          came back with an answer; the answer was just "no such page". */}
      <path
        className="nf-a-wire"
        d="M162 74 V86"
        stroke={accent}
        strokeWidth="2.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />
      <path
        className="nf-a-wire"
        d="M162 104 V120"
        stroke={accent}
        strokeWidth="2.5"
        strokeDasharray="2 6"
        strokeLinecap="round"
      />

      {/* The character: a question mark where the error screen has an X. */}
      <g className="nf-a-char">
        <circle
          className="nf-a-halo"
          cx="162"
          cy="95"
          r="11"
          fill="none"
          stroke={accent}
          strokeWidth="2"
        />
        <circle
          cx="162"
          cy="95"
          r="11"
          fill="#FFFFFF"
          stroke={accent}
          strokeWidth="2"
        />
        <text
          x="162"
          y="95"
          textAnchor="middle"
          dominantBaseline="central"
          fill={accent}
          fontSize="13"
          fontWeight="700"
          fontFamily="inherit"
        >
          ?
        </text>
      </g>

      {/* This browser window. Identical to the error screen's, so the viewer
          recognises "that's me" in both without having to work it out. Its
          skeleton bars breathe, i.e. it is still waiting for content that is
          never going to arrive. */}
      <g>
        <rect
          x="104"
          y="120"
          width="116"
          height="54"
          rx="10"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <path d="M104 138 H220" stroke="#E2E8F0" strokeWidth="2" />
        <circle cx="117" cy="129" r="2.5" fill="#CBD5E1" />
        <circle cx="126" cy="129" r="2.5" fill="#CBD5E1" />
        <circle cx="135" cy="129" r="2.5" fill="#CBD5E1" />
        <rect
          className="nf-a-bar"
          x="116"
          y="149"
          width="60"
          height="6"
          rx="3"
          fill="#E2E8F0"
          style={{ animationDelay: "0.5s" }}
        />
        <rect
          className="nf-a-bar"
          x="116"
          y="160"
          width="38"
          height="6"
          rx="3"
          fill="#E2E8F0"
          style={{ animationDelay: "0.9s" }}
        />
      </g>
    </svg>
  );
};

/**
 * The screen shown for an unmatched route.
 *
 * WHY IT READS THE WAY IT DOES
 * ----------------------------
 * The old version led with a 9rem "404" at 20% opacity. Three problems with
 * that: the code is meaningless to a salesperson, it was the largest and
 * faintest thing on screen at once (so it dominated the layout while being
 * deliberately hard to read), and it made a routine mistyped URL look like a
 * system fault - the same confusion we just fixed on the error screen.
 *
 * So the number is gone from the headline and the page says, in words, the two
 * things the person needs: this address has nothing behind it, and the CRM
 * itself is fine. The code still appears, once, small, in the footnote next to
 * the path - where it belongs, as something to quote when reporting a bad
 * link.
 *
 * Layout, brand mark, card, button shapes and copy tone are taken verbatim
 * from ErrorBoundary. Shared on purpose: these are the only two screens in the
 * CRM that interrupt someone mid-task, and they should feel like the same
 * product speaking, not two different ones.
 *
 * The entrance is staggered top-to-bottom so the eye is walked down to the
 * buttons rather than dropped onto a finished page all at once. It runs for
 * about three quarters of a second in total and then stops - a 404 should not
 * feel slower to arrive than the page they actually wanted.
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only offer "Go back" when there is somewhere to go back TO. The common way
  // to reach a 404 is a stale bookmark or a typed address - i.e. a fresh tab
  // with an empty history, where this button would either do nothing at all or
  // walk the person out of the CRM entirely. A dead control is worse than no
  // control, so it is rendered conditionally rather than disabled.
  const canGoBack =
    typeof window !== "undefined" && (window.history?.length ?? 0) > 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 px-4 py-10">
      <style>{motionStyles}</style>

      <div className="w-full max-w-lg">
        {/* Brand mark above the card - same reassurance as on the error
            screen: an unbranded dead end reads as the browser having given up
            on the site, rather than the site answering a bad address. */}
        <div
          className="nf-rise flex items-center justify-center gap-2 mb-5"
          style={{ animationDelay: "0.05s" }}
        >
          <img
            src="/assets/images/aajneeti-favicon.png"
            alt=""
            className="w-7 h-7 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="text-lg font-semibold tracking-tight text-slate-800">
            CRM
          </span>
        </div>

        <div
          className="nf-rise bg-white rounded-2xl border border-slate-200 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] px-8 pt-8 pb-9 text-center"
          style={{ animationDelay: "0.15s" }}
        >
          <MissingPageArt />

          <h1
            className="nf-rise mt-6 text-[1.375rem] leading-tight font-semibold text-slate-900"
            style={{ animationDelay: "0.3s" }}
          >
            This page doesn&apos;t exist
          </h1>

          {/* Cause, then reassurance, then the way out - the same order as the
              error screen, because the unspoken question is the same one:
              "is something wrong, and is my work safe?" */}
          <p
            className="nf-rise mt-2.5 text-sm leading-relaxed text-slate-600 max-w-sm mx-auto"
            style={{ animationDelay: "0.4s" }}
          >
            The address may be out of date, or mistyped somewhere along the way.{" "}
            <span className="text-slate-800 font-medium">Nothing is broken</span>{" "}
            &mdash; the rest of the CRM is working normally.
          </p>

          <div
            className="nf-rise mt-7 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5 justify-center"
            style={{ animationDelay: "0.5s" }}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#AC2334] hover:bg-[#8e1c2b] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#AC2334]/20 active:translate-y-0 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#AC2334]/40 focus:ring-offset-2"
              autoFocus
            >
              <Icon name="LayoutDashboard" size={16} color="#fff" />
              Go to Dashboard
            </button>

            {canGoBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-slate-700 text-sm font-semibold border border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                {/* The arrow slides left on hover - the button previews its
                    own direction before it is clicked. */}
                <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
                  <Icon name="ArrowLeft" size={16} />
                </span>
                Go back
              </button>
            )}
          </div>
        </div>

        {/* Footnote. The path is shown because it is the single most useful
            thing a person can quote when a link in an email or a saved
            bookmark has gone stale - and it is the only place the code "404"
            still appears, at the size it deserves. `break-all` because lead
            and project URLs carry long ids that would otherwise overflow. */}
        <p
          className="nf-rise mt-5 text-center text-xs text-slate-400 max-w-sm mx-auto"
          style={{ animationDelay: "0.65s" }}
        >
          Followed a link to get here? Let the team know, and include this
          address:
          <br />
          <span className="font-mono text-slate-500 break-all">
            {location?.pathname || "/"}
          </span>
          <span className="text-slate-300"> &middot; 404</span>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
