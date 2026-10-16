/**
 * Dussehra festive theme switch.
 *
 * One boolean and one date window decide whether `body.festive` is set. Every
 * festive style hangs off that class (see styles/festive.css), so this file is
 * the only place the theme is turned on or off.
 *
 * Removing the theme after the festival: delete this file, its call in
 * App.jsx, styles/festive.css and its import in index.jsx. Nothing else in the
 * codebase will know the theme existed — which is the point. The previous
 * seasonal theme was removed by stubbing components out instead, and the
 * leftovers caused a z-index bug months later.
 */

// Master switch. Set false to turn the theme off immediately, whatever the
// date says — useful for a screenshot or a demo out of season.
const FESTIVE_ENABLED = true;

// Inclusive date window, local time. Outside it the theme self-disables, so
// nobody has to remember to ship a change the morning after the festival.
const FESTIVE_START = "2026-10-15";
const FESTIVE_END = "2026-10-26";

const withinWindow = (now = new Date()) => {
  const start = new Date(`${FESTIVE_START}T00:00:00`);
  const end = new Date(`${FESTIVE_END}T23:59:59`);
  return now >= start && now <= end;
};

/** True when the festive theme should be showing right now. */
export const isFestiveSeason = (now = new Date()) =>
  FESTIVE_ENABLED && withinWindow(now);

/**
 * Adds or removes `body.festive`. Safe to call repeatedly; called once from
 * App.jsx on mount.
 */
export const applyFestiveTheme = () => {
  try {
    document.body.classList.toggle("festive", isFestiveSeason());
  } catch {
    /* no document (SSR/tests) — the theme is cosmetic, so failing is fine */
  }
};
