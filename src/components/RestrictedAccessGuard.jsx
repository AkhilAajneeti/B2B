import { useEffect } from "react";

/**
 * Suppresses the DevTools keyboard shortcuts and the right-click menu for
 * EVERYONE. Renders nothing.
 *
 * Mounted in App.jsx above the router, so it covers the login screen as well
 * as every page behind it — there is no role check left to wait for.
 *
 * Applied to all roles as of 2026-11-18, by request. It was previously gated
 * on `isMaskedUser()` and so only ever ran for restricted accounts.
 *
 * Skipped while running the Vite dev server (`import.meta.env.DEV`), because
 * otherwise it blocks DevTools for whoever is building the app. A production
 * build — including `vite preview` of one — has it active. Delete that check
 * if it should apply in dev as well.
 *
 * ⚠️  THIS IS A SPEED BUMP, NOT A LOCK — do not treat it as protection, and do
 * not let its presence stand in for the real fix.
 *
 * It blocks two of the ways into DevTools. It cannot block:
 *   - the browser's own menu (⋮ → More tools → Developer tools), which is
 *     browser chrome no page script can see;
 *   - DevTools opened BEFORE navigating here — this listener never ran, and the
 *     Network tab records every request from the first one;
 *   - Shift+F10 or the dedicated context-menu key, which on many systems don't
 *     raise a cancellable `contextmenu` event;
 *   - `view-source:`, Save Page As, extensions, or a different browser;
 *   - a proxy (Fiddler / Charles) reading the traffic outside the browser;
 *   - the auth token in localStorage being replayed from curl or Postman, which
 *     returns every field with no browser involved at all.
 *
 * The only thing that actually withholds customer contact details is the server
 * not sending them: field-level read permissions on the Lead entity for this
 * user's role in EspoCRM.
 */

// Matched on `code` rather than `key` so a non-US keyboard layout — or the dead
// key Mac produces for Cmd+Option+I — doesn't slip through.
const DEVTOOLS_CODES = new Set(["KeyI", "KeyJ", "KeyC"]);

const RestrictedAccessGuard = () => {
  useEffect(() => {
    // Dev server only — see the note in the block comment above.
    if (import.meta.env.DEV) return undefined;

    const onKeyDown = (event) => {
      const code = event.code;
      const mod = event.ctrlKey || event.metaKey;

      // F12
      if (code === "F12") {
        event.preventDefault();
        return;
      }
      // Ctrl/Cmd + Shift + I / J / C, and the Mac Cmd + Option + I / J / C
      if (mod && (event.shiftKey || event.altKey) && DEVTOOLS_CODES.has(code)) {
        event.preventDefault();
        return;
      }
      // Ctrl/Cmd + U — view source
      if (mod && !event.shiftKey && !event.altKey && code === "KeyU") {
        event.preventDefault();
      }
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    // Capture phase so the handler runs before anything downstream can stop
    // propagation and let the shortcut through.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
    };
    // Nothing role-dependent is read any more, so this runs once per mount and
    // never needs to re-run.
  }, []);

  return null;
};

export default RestrictedAccessGuard;
