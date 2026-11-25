/**
 * Step-up elevation: how long the current session counts as "recently
 * verified".
 *
 * A logged-in user holds a 30-day session. Sensitive actions — today that is
 * everything under /Export — additionally require that the session was
 * verified with a fresh OTP in the last 5 minutes. The gateway is what
 * enforces this; everything here is bookkeeping so the UI can ask for a code
 * BEFORE firing a request that would only come back 403.
 *
 * NO IMPORTS, ON PURPOSE. `services/session` has to reset the elevation when
 * it tears a session down, and `services/stepUp.service` has to read and set
 * it while importing `session` for the 401 path. Putting the state in either
 * of them makes that a cycle. It lives here instead, and both import this.
 *
 * THE CLOCK IS THE DEVICE'S, NOT THE SERVER'S. The verify response carries
 * both `stepUpUntil` (a server timestamp) and `stepUpExpiresIn` (a duration),
 * and we use the duration. A device whose clock is an hour behind would read
 * the server's absolute timestamp as an hour of elevation and stop asking for
 * codes; read as a duration, a wrong clock costs nothing, because both ends
 * of the comparison are then wrong by the same amount.
 */

/** sessionStorage, so a reload inside the window does not ask again — and so
 *  the elevation cannot outlive the tab. */
const KEY = "step_up_until";

/**
 * Treat the session as elevated only while this much time is still left.
 *
 * Without the margin a request can be authorised here and arrive at the
 * gateway after the window shuts, producing exactly the 403 the ask-first
 * check exists to avoid. 15s is comfortably longer than any of these
 * round-trips.
 */
const MARGIN_MS = 15000;

/** Mirror, for Safari private mode and anywhere sessionStorage throws. */
let memoryUntil = 0;

const read = () => {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return memoryUntil;
  }
};

const write = (value) => {
  memoryUntil = value;
  try {
    sessionStorage.setItem(KEY, String(value));
  } catch {
    /* storage disabled — the in-memory mirror still covers this tab */
  }
};

/** When the current elevation ends, on this device's clock. 0 = never elevated. */
export const elevationEndsAt = () => read();

export const isElevated = () => Date.now() + MARGIN_MS < read();

/** @param {number} expiresInSeconds `stepUpExpiresIn` from the verify response. */
export const recordElevation = (expiresInSeconds) => {
  const seconds = Number(expiresInSeconds);
  write(Date.now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 0) * 1000);
};

/**
 * Drops the elevation.
 *
 * Called on login and on logout — a new session starts un-elevated, and a
 * fresh login is explicitly NOT a step-up, so the first export after signing
 * in still asks for a code. Also called when a 403 proves our record was out
 * of date.
 */
export const resetElevation = () => {
  memoryUntil = 0;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage disabled — the mirror above is already cleared */
  }
};
