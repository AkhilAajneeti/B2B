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
 * behaves exactly as it did before this module existed. Nothing changes
 * unless someone deliberately sets the variable.
 */

const PRODUCTION_GATEWAY = "https://gateway.aajneetiadvertising.com";

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

export const API_BASE_URL =
  normalise(import.meta.env?.VITE_API_BASE_URL) ?? PRODUCTION_GATEWAY;

/** True when pointed anywhere other than production. Handy for a dev banner. */
export const IS_PRODUCTION_GATEWAY = API_BASE_URL === PRODUCTION_GATEWAY;

export default API_BASE_URL;
