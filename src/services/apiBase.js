/**
 * The CRM gateway's base URL, in one place.
 *
 * Every service used to hardcode `https://gateway.aajneetiadvertising.com`
 * inline — 110 times across 21 files. That made switching environments a
 * find-and-replace across the whole tree, which is why the test gateway was
 * never actually used: the cost of pointing the app at it, and of pointing it
 * back, was an all-files diff each way.
 *
 * Set VITE_API_BASE_URL in .env to override (no trailing slash):
 *
 *   VITE_API_BASE_URL=https://test-gateway.aajneetiadvertising.com
 *
 * UNSET IS THE NORMAL CASE. The fallback below is production, so an
 * environment with no .env at all — a fresh clone, CI, the Vercel build —
 * behaves exactly as it did before this module existed.
 *
 * ---------------------------------------------------------------------------
 * PER-SESSION OVERRIDE  (temporary — see OTP_EXEMPT_USERNAMES in auth.service)
 * ---------------------------------------------------------------------------
 * While 2FA is served only by the test gateway, one account needs to sign in
 * against the no-OTP production gateway. A session is therefore pinned to the
 * gateway that issued it: its token is only valid there, so sending a later
 * request anywhere else would 401 and dump the user back at the login screen.
 *
 * The pin is read ONCE, at module load. That is why the login screen forces a
 * full page load when the gateway changes — a soft react-router navigate would
 * leave this value as whatever it was when the tab opened.
 *
 * REMOVING THIS LATER: once the gateway exempts the account itself (or
 * production serves 2FA), delete SESSION_GATEWAY_KEY and its helpers, drop the
 * pin lookup below, and remove the writes in LoginForm. Nothing else reads it.
 */

const PRODUCTION_GATEWAY = "https://gateway.aajneetiadvertising.com";
const TEST_GATEWAY = "https://test-gateway.aajneetiadvertising.com";

/**
 * Trailing slashes are stripped because every call site appends its own path
 * as `${API_BASE_URL}/Lead`. A base of ".../" would produce ".../\/Lead",
 * which EspoCRM answers with a 404 — a failure that would look like "my data
 * is not loading" rather than like a typo in .env.
 */
const normalise = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim().replace(/\/+$/, "")
    : null;

/** The gateway chosen by configuration, before any per-session pin. */
export const DEFAULT_GATEWAY =
  normalise(import.meta.env?.VITE_API_BASE_URL) ?? PRODUCTION_GATEWAY;

/**
 * Gateways a session is allowed to be pinned to.
 *
 * THIS ALLOWLIST IS A SECURITY CONTROL, not tidiness. The pin lives in
 * localStorage, which any script on the page — or anyone with the console
 * open — can write. Without this check, setting `api_gateway` to an attacker's
 * host would send every subsequent request, Authorization token included,
 * straight to them. An unrecognised value is ignored and we fall back to the
 * configured gateway.
 */
const ALLOWED_GATEWAYS = new Set(
  [PRODUCTION_GATEWAY, TEST_GATEWAY, DEFAULT_GATEWAY].filter(Boolean),
);

/** localStorage key holding the gateway that issued the current session. */
export const SESSION_GATEWAY_KEY = "api_gateway";

const readPinnedGateway = () => {
  try {
    const pinned = normalise(localStorage.getItem(SESSION_GATEWAY_KEY));
    return pinned && ALLOWED_GATEWAYS.has(pinned) ? pinned : null;
  } catch {
    return null; // storage disabled — fall back to configuration
  }
};

export const API_BASE_URL = readPinnedGateway() ?? DEFAULT_GATEWAY;

/** True when pointed at production. Handy for a dev banner. */
export const IS_PRODUCTION_GATEWAY = API_BASE_URL === PRODUCTION_GATEWAY;

export const GATEWAYS = {
  PRODUCTION: PRODUCTION_GATEWAY,
  TEST: TEST_GATEWAY,
};

/**
 * Pins this session to the gateway that authenticated it.
 *
 * @returns {boolean} true if the value differs from the gateway this page
 *   already loaded with — in which case the caller MUST do a full page load
 *   (not a react-router navigate) before any data request, because
 *   `API_BASE_URL` above was already fixed at import time.
 */
export const setSessionGateway = (gateway) => {
  const value = normalise(gateway);
  if (!value || !ALLOWED_GATEWAYS.has(value)) return false;

  try {
    localStorage.setItem(SESSION_GATEWAY_KEY, value);
  } catch {
    /* storage disabled — the session simply uses the configured gateway */
  }
  return value !== API_BASE_URL;
};

/** Drops the pin. Called on logout so the next person starts from config. */
export const clearSessionGateway = () => {
  try {
    localStorage.removeItem(SESSION_GATEWAY_KEY);
  } catch {
    /* storage disabled — nothing to clear */
  }
};

export default API_BASE_URL;
