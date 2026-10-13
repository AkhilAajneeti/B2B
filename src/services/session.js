/**
 * Session teardown, in one place.
 *
 * Every service used to inline this on an auth failure:
 *
 *   if (res.status === 401 || res.status === 403) {
 *     localStorage.clear();
 *     window.location.href = "/login";
 *   }
 *
 * Two problems with that, both of which logged people out of healthy sessions:
 *
 * 1. 403 IS NOT 401. A 401 means the session is dead and logging out is
 *    correct. A 403 means the session is fine but the user's role isn't
 *    allowed to read THAT entity — a routine answer in a CRM with per-role
 *    ACLs. Treating it as a dead session meant one forbidden entity could end
 *    the session, and because these pages fire several requests at once on
 *    load, the token was being cleared while the others were still in flight.
 *    Those then failed for want of a token, which is why the failure looked
 *    random. 403 now rejects like any other error and surfaces on the one
 *    widget that asked for it.
 *
 * 2. `localStorage.clear()` wipes EVERYTHING, not just the session — the teams
 *    and users caches, the followup-reminder dedupe set (so the same reminders
 *    re-fire after the next login), sidebar and theme preferences. The Header's
 *    own logout already removes keys explicitly for exactly this reason; the
 *    services never got the same treatment. This matches that behaviour.
 */

// The session itself.
const AUTH_KEYS = ["auth_token", "login_object", "acl", "isAuthenticated"];

// Per-user caches, namespaced by user id. Cleared alongside the session so the
// next person to log in on this machine can't be served the previous user's
// cached rows. Mirrors the prefixes the Header's logout sweeps.
const USER_CACHE_PREFIXES = [
  "leads_count_cache_",
  "users_cache_",
  "teams_cache_",
];

/** Removes the session and per-user caches, leaving unrelated keys alone. */
export const clearSession = () => {
  try {
    AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage).forEach((k) => {
      if (USER_CACHE_PREFIXES.some((prefix) => k.startsWith(prefix))) {
        localStorage.removeItem(k);
      }
    });
  } catch {
    /* storage disabled — the redirect below still gets them to a clean login */
  }
};

/**
 * Called when a request comes back 401. Tears down the session and sends the
 * user to the login screen.
 *
 * Deliberately NOT called for 403 — see the note above.
 */
export const handleUnauthorized = () => {
  clearSession();
  window.location.href = "/login";
};
