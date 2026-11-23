import React from "react";
import { useTheme } from "hooks/useTheme";

/**
 * Light / dark switch for the header.
 *
 * SHOWN TO EVERY ACCOUNT, restricted ones included. It reveals nothing about
 * the business — unlike the notification bell beside it, which is hidden from
 * restricted users because its feed is internal workflow.
 *
 * WHY IT IS BUILT LIKE THE BELL. Its first version was a plain outlined circle
 * with a grey lucide glyph, sitting immediately left of a bell that has a
 * radial fill, a tricolour glyph and a hover glow. Next to that it read as
 * disabled. So it borrows the same construction — radial fill palest at the
 * centre, colour in the glyph, glow on hover — and the two now read as a pair.
 * It stays a step quieter than the bell, which is the one carrying unread
 * state and has the stronger claim on attention.
 *
 * WHY THE ICON SHOWS THE DESTINATION, NOT THE CURRENT STATE. In light mode it
 * is a moon: "press for dark". The other convention — a sun because you are in
 * light mode — is equally common and reads as a label rather than a button,
 * and a label you can press is worse than either. The aria-label and title say
 * it in words, so neither convention has to carry the meaning alone.
 *
 * MOTION. Both scenes are rendered at once and crossfaded through a rotate, so
 * the press has something to show for itself; a straight swap at 18px looks
 * like a glitch. Each scene also has a resting animation — the sun's rays turn
 * and its core breathes, the moon's stars blink on staggered delays — which is
 * what makes the control findable in peripheral vision. All of it sits behind
 * prefers-reduced-motion; see the keyframes in styles/index.css.
 */
const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggle } = useTheme();

  // One shared transition for both scenes, so they cross exactly.
  const scene = (shown) =>
    `tt-art absolute transition-all duration-500 ease-out motion-reduce:duration-0 ${
      shown
        ? "rotate-0 scale-100 opacity-100"
        : "-rotate-90 scale-50 opacity-0"
    }`;

  return (
    <button
      type="button"
      onClick={toggle}
      // aria-pressed, not a checkbox role: this is a button whose effect is
      // visible on the whole page, and screen readers announce the pressed
      // state without the label having to change.
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full transition-shadow duration-300 hover:shadow-[0_0_14px_4px_var(--toggle-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
      style={{
        // Matched to the bell's profile: palest at the centre, strongest at
        // the circumference, with no rim stroke. The colour lives entirely in
        // the fill, so the glyph stays the only saturated thing in it.
        background:
          "radial-gradient(circle, var(--toggle-core) 0%, var(--toggle-mid) 46%, var(--toggle-edge) 100%)",
      }}
    >
      {/* Drifting light on hover — blurred and under the glyph, so it reads as
          light moving round the rim rather than a spinning ring. Tinted by the
          theme so it is warm in light mode and cool in dark. */}
      <span
        className="pointer-events-none absolute inset-[-50%] opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70 motion-safe:group-hover:animate-[spin_7s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, transparent 55%, var(--toggle-glow) 78%, transparent 100%)",
        }}
      />

      {/* ── NIGHT, shown while LIGHT: press for dark ─────────────────────── */}
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={scene(!isDark)}
      >
        <defs>
          <linearGradient id="ttMoon" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#9333EA" />
          </linearGradient>
        </defs>

        {/* Crescent, drawn as a single filled path rather than two overlapping
            circles — a cut-out needs a mask, and a mask over a gradient
            background shows its own edge. */}
        <path
          className="tt-a-moon"
          d="M20.1 14.6A8.4 8.4 0 0 1 9.4 3.9a8.4 8.4 0 1 0 10.7 10.7Z"
          fill="url(#ttMoon)"
        />

        {/* Three stars, deliberately out of phase. */}
        <circle className="tt-a-star" cx="16.6" cy="5.1" r="1.05" fill="#6366F1" />
        <circle className="tt-a-star" cx="20.2" cy="8.4" r="0.75" fill="#A855F7" style={{ animationDelay: "0.9s" }} />
        <circle className="tt-a-star" cx="19.4" cy="3.4" r="0.6" fill="#818CF8" style={{ animationDelay: "1.7s" }} />
      </svg>

      {/* ── DAY, shown while DARK: press for light ───────────────────────── */}
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={scene(isDark)}
      >
        <defs>
          <linearGradient id="ttSun" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
        </defs>

        {/* Rays as one group so a single rotation turns all eight. Slow enough
            (18s) to be noticed only once you look at it. */}
        <g
          className="tt-a-rays"
          stroke="url(#ttSun)"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="12" y1="1.6" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22.4" />
          <line x1="1.6" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22.4" y2="12" />
          <line x1="4.7" y1="4.7" x2="6.4" y2="6.4" />
          <line x1="17.6" y1="17.6" x2="19.3" y2="19.3" />
          <line x1="4.7" y1="19.3" x2="6.4" y2="17.6" />
          <line x1="17.6" y1="6.4" x2="19.3" y2="4.7" />
        </g>

        <circle className="tt-a-core" cx="12" cy="12" r="5" fill="url(#ttSun)" />
      </svg>
    </button>
  );
};

export default ThemeToggle;
