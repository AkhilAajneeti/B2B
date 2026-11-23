/**
 * Light / dark theme: storage, resolution, and the `dark` class on <html>.
 *
 * THREE STATES, NOT TWO. Stored preference is "light", "dark", or ABSENT —
 * and absent is not the same as light. Absent means "follow the OS", so a user
 * who has never touched the toggle tracks their laptop switching to dark at
 * sunset. Once they pick a side, that choice wins over the OS forever, because
 * someone who deliberately chose light in a dark-mode OS meant it.
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

/** What the OS is asking for right now. */
export const systemTheme = () => {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? THEMES.DARK
      : THEMES.LIGHT;
  } catch {
    return THEMES.LIGHT;
  }
};

/** The theme that should actually be on screen: explicit choice, else the OS. */
export const resolveTheme = () => readStoredTheme() ?? systemTheme();

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
 * Passing null clears the choice and goes back to following the OS. Nothing in
 * the UI does that today — the toggle is two-state — but the storage model
 * supports it, so a later "System" option needs no change here.
 */
export const setTheme = (theme) => {
  try {
    if (isTheme(theme)) localStorage.setItem(THEME_KEY, theme);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    /* storage disabled — the choice applies for this page load only */
  }

  const resolved = isTheme(theme) ? theme : systemTheme();
  applyTheme(resolved);
  notify(resolved);
  return resolved;
};

/** Flips to the other theme and records it as explicit. */
export const toggleTheme = () =>
  setTheme(resolveTheme() === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);

/**
 * Subscribes to theme changes, from any of the three things that cause one.
 *
 * @returns {() => void} unsubscribe
 */
export const subscribeTheme = (fn) => {
  listeners.add(fn);

  // The OS switching over — but only while the user has made no explicit
  // choice. Checked at event time rather than at subscribe time, so choosing a
  // theme stops OS changes from overriding it without re-subscribing.
  let media;
  const onMedia = () => {
    if (readStoredTheme() === null) {
      const resolved = systemTheme();
      applyTheme(resolved);
      fn(resolved);
    }
  };

  // Another tab toggling. `storage` fires only in OTHER tabs, which is exactly
  // what is wanted: this tab already applied its own change above.
  const onStorage = (event) => {
    if (event.key !== THEME_KEY) return;
    const resolved = resolveTheme();
    applyTheme(resolved);
    fn(resolved);
  };

  try {
    media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
  } catch {
    /* no matchMedia — in-tab toggling still works */
  }

  return () => {
    listeners.delete(fn);
    try {
      media?.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    } catch {
      /* nothing to detach */
    }
  };
};
