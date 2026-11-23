/**
 * Light / dark theme: storage, resolution, and the `dark` class on <html>.
 *
 * LIGHT IS THE DEFAULT, and the OS preference is deliberately NOT consulted.
 * An earlier version seeded the first visit from prefers-color-scheme, which
 * meant a sales rep whose laptop happened to be in dark mode opened the CRM to
 * a redesign they never asked for. Dark mode here is opt-in: until the toggle
 * is pressed, the app looks exactly as it did before dark mode existed.
 *
 * TO GO BACK TO FOLLOWING THE OS, two things change together — `resolveTheme`
 * below, and the inline script in index.html. Both would read
 * `window.matchMedia("(prefers-color-scheme: dark)")` when no value is stored.
 * Changing only one is the bug this file is arranged to make obvious.
 *
 * STORED STATE IS STILL THREE-VALUED: "light", "dark", or absent. Absent and
 * "light" now render the same, but they are not the same thing — absent means
 * "never chose", which is what a future System option would hang off, and what
 * setTheme(null) resets to.
 *
 * THE STORAGE KEY IS DUPLICATED IN index.html, deliberately. The inline script
 * there applies the class before first paint; without it the app renders light
 * and repaints dark a moment later, which is the white flash every retrofitted
 * dark mode is known for. That script cannot import this module — it has to
 * run before the bundle loads — so the key and the class name exist in both
 * places. They are the only two things that must agree, and both sides carry a
 * comment pointing at the other.
 *
 * NOT CLEARED ON LOGOUT. services/session.js removes named keys only, so the
 * theme survives a sign-out. That is intended: it is a property of this
 * browser, not of whoever is signed in.
 */

/** localStorage key. MUST match the inline script in index.html. */
export const THEME_KEY = "theme";

/** Class placed on <html>. MUST match index.html and `darkMode` in the Tailwind config. */
const DARK_CLASS = "dark";

export const THEMES = { LIGHT: "light", DARK: "dark" };

const isTheme = (value) =>
  value === THEMES.LIGHT || value === THEMES.DARK;

/**
 * The user's explicit choice, or null when they have never chosen.
 *
 * An unrecognised value is treated as "never chosen" rather than trusted —
 * localStorage is editable by hand, and a junk value should degrade to
 * following the OS rather than to an undefined class on <html>.
 */
export const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null; // storage disabled — behave as if nothing was ever chosen
  }
};

/**
 * The theme that should actually be on screen: the explicit choice, else
 * light.
 *
 * No media query. See the note at the top of this file — dark mode is opt-in,
 * and this is the one line that decides it (together with its twin in
 * index.html).
 */
export const resolveTheme = () => readStoredTheme() ?? THEMES.LIGHT;

/**
 * Puts the theme on <html>.
 *
 * Also keeps the `theme-color` meta in step, which is what colours the browser
 * chrome on Android and the iOS status bar. Left alone, a dark page keeps a
 * crimson bar above it and the seam is obvious.
 */
export const applyTheme = (theme) => {
  const dark = theme === THEMES.DARK;

  try {
    document.documentElement.classList.toggle(DARK_CLASS, dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0E1116" : "#AC2334");
  } catch {
    /* no DOM (SSR, tests) — nothing to apply */
  }

  return theme;
};

/** Listeners notified when the theme changes in THIS tab. */
const listeners = new Set();

const notify = (theme) => {
  listeners.forEach((fn) => {
    try {
      fn(theme);
    } catch {
      /* a broken listener must not stop the others */
    }
  });
};

/**
 * Records an explicit choice and applies it.
 *
 * Passing null clears the choice, which returns to the light default. Nothing
 * in the UI does that today — the toggle is two-state — but the storage model
 * keeps "never chose" distinct, so a later "System" option is a change to
 * resolveTheme rather than to every caller.
 */
export const setTheme = (theme) => {
  try {
    if (isTheme(theme)) localStorage.setItem(THEME_KEY, theme);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    /* storage disabled — the choice applies for this page load only */
  }

  const resolved = isTheme(theme) ? theme : THEMES.LIGHT;
  applyTheme(resolved);
  notify(resolved);
  return resolved;
};

/** Flips to the other theme and records it as explicit. */
export const toggleTheme = () =>
  setTheme(resolveTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);

/**
 * Subscribes to theme changes.
 *
 * There is no prefers-color-scheme listener: the OS does not drive the theme,
 * so there is nothing to react to. Add one back alongside the resolveTheme
 * change if the default ever becomes "follow the OS".
 *
 * @returns {() => void} unsubscribe
 */
export const subscribeTheme = (fn) => {
  listeners.add(fn);

  // Another tab toggling. `storage` fires only in OTHER tabs, which is exactly
  // what is wanted: this tab already applied its own change above.
  const onStorage = (event) => {
    if (event.key !== THEME_KEY) return;
    const resolved = resolveTheme();
    applyTheme(resolved);
    fn(resolved);
  };

  try {
    window.addEventListener("storage", onStorage);
  } catch {
    /* no window — in-tab toggling still works */
  }

  return () => {
    listeners.delete(fn);
    try {
      window.removeEventListener("storage", onStorage);
    } catch {
      /* nothing to detach */
    }
  };
};
