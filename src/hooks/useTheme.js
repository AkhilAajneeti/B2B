import { useCallback, useEffect, useState } from "react";
import {
  THEMES,
  resolveTheme,
  subscribeTheme,
  toggleTheme as applyToggle,
} from "utils/theme";

/**
 * The current theme, and a toggle.
 *
 * State is seeded from `resolveTheme()` rather than from a constant, because
 * the class is already on <html> by the time React mounts — the inline script
 * in index.html put it there. Defaulting to "light" here would make the first
 * render disagree with the DOM and flip the toggle's icon on mount.
 *
 * Subscribing matters even though this hook owns the toggle: the theme can also
 * change because the OS switched (while no explicit choice is stored) or
 * because another tab toggled it. Without the subscription the icon in this
 * tab would go stale while the page around it changed colour.
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState(resolveTheme);

  useEffect(() => subscribeTheme(setThemeState), []);

  const toggle = useCallback(() => {
    setThemeState(applyToggle());
  }, []);

  return { theme, isDark: theme === THEMES.DARK, toggle };
};

export default useTheme;
