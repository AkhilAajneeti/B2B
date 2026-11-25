/**
 * Step-up verification — asking a logged-in user to prove it is still them.
 *
 * THE FLOW (gateway side, proxy.js):
 *   1. A protected request without a recent verification -> 403
 *      `{ status: "step_up_required" }`. The CRM is never called.
 *   2. POST /auth/step-up          -> sends a code by email and WhatsApp,
 *                                     returns { message, challengeToken }.
 *   3. POST /auth/step-up/verify   -> { otp, challengeToken }
 *                                  -> { token, stepUpExpiresIn }
 *   4. The re-issued token replaces the stored one. Protected actions now
 *      work for 5 minutes.
 *
 * THE RULE THAT MATTERS MOST, and the reason this lives in one module rather
 * than being handled inline at each call site:
 *
 *   401                     -> session is dead, log out (unchanged behaviour)
 *   403 step_up_required    -> ask for a code. NEVER log out.
 *   400 from .../verify     -> wrong or expired code. NEVER log out.
 *
 * Getting that wrong turns "confirm it is you" into "you have been signed
 * out", which is both alarming and loses whatever the person was doing.
 *
 * THERE IS NO RESEND ENDPOINT for step-up. A new code means calling
 * /auth/step-up again and using the NEW challengeToken — the previous one
 * stops working the moment a fresh code is issued.
 *
 * WHY A REGISTERED OPENER. A service module cannot render a React dialog, and
 * the dialog cannot live at the call site because several call sites share
 * it. StepUpGate (mounted once in App) registers its opener here at mount;
 * this module calls it. That is the whole indirection.
 */

import { API_BASE_URL } from "services/apiBase";
import { isElevated, recordElevation, resetElevation } from "utils/elevation";
import { handleUnauthorized } from "./session";

/** The `status` a protected 403 carries. Anything else is an ordinary 403. */
export const STEP_UP_STATUS = "step_up_required";

/**
 * Thrown when the user closes the dialog.
 *
 * Carries a flag rather than relying on the message, so a caller can stay
 * silent on a cancel — a toast saying "Export failed" after someone
 * deliberately backed out is noise, and reads as a bug.
 */
export class StepUpCancelled extends Error {
  constructor() {
    super("Verification cancelled");
    this.name = "StepUpCancelled";
    this.cancelled = true;
  }
}

export const isCancellation = (err) => Boolean(err?.cancelled);

/**
 * Statuses that mean the ROUTE IS NOT THERE, as opposed to the request being
 * refused. Only these are treated as "this gateway does not do step-up".
 *
 * Deliberately narrow. A 400, 401 or 500 is the gateway answering ABOUT this
 * request, and waving those through would turn a real failure into a silent
 * bypass of the verification.
 */
const ROUTE_ABSENT_STATUSES = new Set([404, 405, 501]);

/**
 * Set once a gateway proves it has no step-up endpoints, so the next export
 * does not pay for another 404.
 *
 * WHY THIS EXISTS. Step-up lives in the new proxy.js. Until that is deployed
 * everywhere, the app has to work against BOTH gateways from one build — the
 * same reason auth.service asks /auth what it is talking to rather than
 * carrying a flag. A gateway without /auth/step-up is also not protecting
 * /Export, so proceeding is correct rather than permissive: there is nothing
 * to verify against.
 *
 * It is NOT a way to skip verification on a gateway that has it. That gateway
 * answers 200, this never trips, and if our record is ever wrong the 403 net
 * in withStepUp still catches it.
 */
let stepUpUnsupported = false;

/* ------------------------------------------------------------------ dialog */

let openDialog = null;

/**
 * Called by StepUpGate on mount.
 *
 * @returns {() => void} unregister, for the effect cleanup.
 */
export const registerStepUpDialog = (fn) => {
  openDialog = fn;
  return () => {
    if (openDialog === fn) openDialog = null;
  };
};

/* ---------------------------------------------------------------- requests */

const authToken = () => localStorage.getItem("auth_token");

const postJson = async (path, body) => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      token: authToken(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // A proxy failure returns HTML with no JSON at all; an empty object keeps
  // the callers below reading fields instead of handling a parser error.
  let data = {};
  try {
    data = (await res.json()) || {};
  } catch {
    /* no JSON body */
  }
  return { status: res.status, data };
};

/**
 * Sends a step-up code. Also the "send a new code" path — there is no resend
 * endpoint, so the caller must swap in the challengeToken this returns.
 */
export const requestStepUpCode = async () => {
  const { status, data } = await postJson("/auth/step-up");

  // 401 here means EspoCRM no longer accepts the session at all —
  // deactivated user, revoked token. That IS a dead session, so the normal
  // logout applies.
  if (status === 401) {
    handleUnauthorized();
    throw new Error("Your session has ended. Please sign in again.");
  }

  // The route is not on this gateway: the old proxy.js, which does not guard
  // /Export either. Remembered so the next export skips straight through.
  if (ROUTE_ABSENT_STATUSES.has(status)) {
    stepUpUnsupported = true;
    const err = new Error("This gateway does not require verification.");
    err.unsupported = true;
    throw err;
  }

  // 400 no_delivery_channel: no email and no WhatsApp-capable mobile on the
  // account. The user stays logged in; the action is simply cancelled.
  if (status !== 200) {
    throw new Error(data.error || "Could not send a verification code.");
  }

  return {
    message: data.message || "",
    channels: Array.isArray(data.channels) ? data.channels : [],
    emailMasked: data.emailMasked || "",
    mobileMasked: data.mobileMasked || "",
    challengeToken: data.challengeToken,
  };
};

/**
 * Verifies a step-up code.
 *
 * Returns the raw `{ status, data }` so the DIALOG can decide what to do with
 * each 400 — a wrong code keeps the dialog open and clears the input, an
 * expired one offers a new code. Resolving them here would mean the dialog
 * could not tell them apart.
 *
 * The OTP is stripped to digits for the same reason as the login flow: a
 * pasted code arrives as "123 456" and the gateway would read that as an
 * incorrect code rather than as malformed input.
 */
export const verifyStepUpCode = async (otp, challengeToken) => {
  const { status, data } = await postJson("/auth/step-up/verify", {
    otp: String(otp).replace(/\D/g, ""),
    challengeToken,
  });

  if (status === 401) {
    handleUnauthorized();
    throw new Error("Your session has ended. Please sign in again.");
  }

  return { status, data };
};

/* --------------------------------------------------------------- elevation */

/**
 * Commits a successful verification.
 *
 * The re-issued token REPLACES the stored one. It is an ordinary session
 * token — after the 5 minutes lapse it keeps working for everything else, and
 * only protected paths ask again. Skipping this swap would leave the old
 * token in place and every protected action would keep answering 403.
 */
const commit = (data) => {
  if (data?.token) localStorage.setItem("auth_token", data.token);
  recordElevation(data?.stepUpExpiresIn);
};

/* ------------------------------------------------------------ orchestration */

/**
 * One dialog at a time.
 *
 * Two quick clicks on Export, or a page firing parallel protected calls, each
 * reach here independently. Without a shared promise each would open its own
 * dialog, and the codes would invalidate one another: every /auth/step-up
 * call issues a new challengeToken and kills the previous one, so the first
 * dialog's code would be dead before it was typed.
 */
let pending = null;

/**
 * Resolves once the session is elevated. Rejects with StepUpCancelled if the
 * user closes the dialog.
 */
export const ensureStepUp = () => {
  if (stepUpUnsupported || isElevated()) return Promise.resolve();

  if (!pending) {
    pending = run().finally(() => {
      pending = null;
    });
  }
  return pending;
};

const run = async () => {
  if (!openDialog) {
    // StepUpGate is not mounted. Failing loudly beats firing the request
    // anyway and surfacing the gateway 403 as "Export failed (403)".
    throw new Error("Verification is unavailable right now. Please reload the page.");
  }

  let started;
  try {
    started = await requestStepUpCode();
  } catch (err) {
    // No step-up on this gateway — nothing to verify, so the action proceeds.
    // Every other failure is a real one and still rejects.
    if (err?.unsupported) return;
    throw err;
  }

  // Resolves with the 200 body once the user enters a correct code; rejects
  // with StepUpCancelled if they close it.
  const verified = await openDialog(started);

  commit(verified);
};

/**
 * Wraps a protected request so a 403 `step_up_required` is answered with a
 * dialog and one retry — the safety net for paths the UI does not know are
 * protected.
 *
 * `send` is called again on retry, so it must build its own request each
 * time: a Request object, or a body already consumed, cannot be replayed.
 *
 * RETRIES ONCE. If the second attempt is refused as well, that response is
 * returned as it stands. Looping on it would reopen the dialog against a
 * gateway that is never going to be satisfied.
 */
export const withStepUp = async (send) => {
  let res = await send();
  if (res.status !== 403) return res;

  // Read a clone: the caller still needs the untouched body.
  let body = {};
  try {
    body = (await res.clone().json()) || {};
  } catch {
    /* not JSON — an ordinary 403 from the CRM own ACL */
  }

  // A plain 403 means this role may not touch this entity. Routine under
  // per-role ACLs, and emphatically not a reason to ask for a code.
  if (body.status !== STEP_UP_STATUS) return res;

  // Our record said elevated and the gateway disagrees, so the record is the
  // thing that is wrong.
  resetElevation();
  await ensureStepUp();

  // A gateway that answers 403 step_up_required but has no /auth/step-up is
  // misconfigured, and retrying would send the identical request for a second
  // refusal. Hand back the 403 instead.
  if (stepUpUnsupported) return res;

  res = await send();
  return res;
};
