/**
 * Help Center brand theme.
 *
 * The Help Center uses ONE brand gradient (black → crimson) everywhere a
 * "brand" moment belongs: hero text, primary CTAs, active-state accents,
 * step-number bubbles, etc.
 *
 * Semantic colors (info / tip / success / warning in NoteCard) are NOT
 * branded — they communicate meaning, not affiliation.
 */

// The deep-crimson end-stop. Use it for borders, text accents and icons.
//
// A var() REFERENCE, not a hex literal, because every consumer applies these
// through an inline `style` prop, which no `dark:` variant can reach. Pointing
// them at tokens makes the whole Help Center follow the theme without touching
// the ten components that read them. The light values are unchanged; see
// --help-brand / --help-soft in styles/tailwind.css.
//
// Anything that needs this colour with alpha must use brandAlpha() below —
// string-concatenating a hex suffix onto a var() produces nonsense.
export const BRAND = "rgb(var(--help-brand))";

// Soft tint of the brand for card backgrounds and subtle highlights.
export const BRAND_SOFT = "rgb(var(--help-soft))";

/** The brand colour at a given opacity, for borders, rings and shadows. */
export const brandAlpha = (alpha) => `rgb(var(--help-brand) / ${alpha})`;

// Inline-style strings for the brand gradient.
export const BRAND_GRADIENT = "linear-gradient(52deg, #000000, #AC2334)";

export const brandBg = { background: BRAND_GRADIENT };

export const brandTextGradient = {
  background: BRAND_GRADIENT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// rgba shadow that matches the brand crimson — used on hover lifts.
export const BRAND_SHADOW = "0 8px 24px -12px rgba(172, 35, 52, 0.35)";
