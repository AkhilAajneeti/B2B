/**
 * Login, in one place — both the legacy single-step flow and the new email-OTP
 * 2FA flow.
 *
 * WHY BOTH. 2FA currently exists only on the test gateway; production `/auth`
 * still answers with the old `{ token, user, acl }` payload. If the login page
 * simply switched to the OTP flow, production sign-in would break the moment
 * it deployed. So nothing here decides which flow to use in advance: it asks
 * the gateway and reacts to what comes back.
 *
 *   GET /auth  ->  { status: "otp_required", challengeToken, emailMasked }
 *                    the 2FA gateway. Caller shows the OTP screen, then calls
 *                    verifyOtp() to get the real session token.
 *
 *   GET /auth  ->  { token, user, acl }
 *                    the legacy gateway. Caller is already logged in.
 *
 * That makes the page correct against either gateway with no flag to flip, and
 * it starts using 2FA by itself on the day production is switched over.
 *
 * WHAT THE SESSION TOKEN IS. Previously `auth_token` held
 * `btoa(JSON.stringify(loginObject))` — a base64 wrapper carrying the Espo
 * token and secret. Under 2FA it holds the gateway's own encrypted session
 * token instead. The KEY NAME IS DELIBERATELY UNCHANGED: `auth_token` is read
 * in ~123 places across 27 files, and every one of them just forwards it as
 * the `token` header. Renaming it to the `crm_token` the integration guide
 * suggests would mean touching all of them to achieve nothing.
 */

import { API_BASE_URL } from "services/apiBase";

const AUTH_URL = `${API_BASE_URL}/auth`;

/**
 * Statuses that mean "this gateway does not serve GET here" and nothing about
 * the credentials themselves — the only case where replaying the request as a
 * POST is both safe and useful. See initiateLogin.
 */
const RETRY_AS_POST_STATUSES = new Set([404, 405, 501]);

/** Shape returned by initiateLogin so callers can branch without string checks. */
export const LOGIN_RESULT = {
  OTP_REQUIRED: "otp_required",
  AUTHENTICATED: "authenticated",
};

/**
 * Reads an error message out of a gateway response.
 *
 * The 2FA endpoints answer with `{ error }`, the legacy one with `{ message }`,
 * and a proxy failure can return HTML with no JSON at all. Without this, a
 * gateway 502 surfaced as the browser's raw "Unexpected token < in JSON"
 * parser error, which tells the user nothing.
 */
const readError = async (res, fallback) => {
  try {
    const data = await res.clone().json();
    return data?.error || data?.message || fallback;
  } catch {
    return fallback;
  }
};

const jsonOrThrow = async (res, fallback) => {
  if (!res.ok) throw new Error(await readError(res, fallback));
  try {
    return await res.json();
  } catch {
    throw new Error(fallback);
  }
};

/**
 * Step 1 — check credentials.
 *
 * On the 2FA gateway this also emails a 6-digit OTP and returns a short-lived
 * `challengeToken`. On the legacy gateway it returns the session outright.
 *
 * NOTE ON METHOD. The integration guide specifies GET with the credentials in
 * a `create-token` header, and that is what we send. The legacy production
 * gateway is currently driven with POST plus a JSON body, so if GET comes back
 * with anything other than success or a straight credential rejection we retry
 * once as POST. A 401 is NEVER retried — that is a definitive "wrong username
 * or password", and sending the credentials a second time would do nothing but
 * count against any rate limit the gateway applies.
 *
 * The `Referer` header the guide lists cannot be set from JavaScript; browsers
 * forbid it. It is sent automatically from the page's own origin, so the
 * gateway needs the dev origin (localhost:4001) allowlisted alongside the
 * production one.
 */
export const initiateLogin = async (username, password) => {
  // Username is trimmed because a mobile autocomplete suggestion inserts a
  // trailing space and the backend compares it verbatim. The PASSWORD is sent
  // exactly as typed: a space can be a legitimate character in one, and
  // silently stripping it would lock out anyone whose password ends in one.
  const createToken = btoa(`${username.trim()}:${password}`);

  let res = await fetch(AUTH_URL, {
    method: "GET",
    headers: { Accept: "application/json", "create-token": createToken },
  });

  // Retry as POST ONLY when the gateway did not understand the method or the
  // route. Every 4xx with a body — 400 "No registered email address found",
  // 401 "Invalid credentials" — is a DEFINITIVE answer about this request, and
  // replaying it would send the credentials a second time, burn an attempt
  // against any rate limit, and still produce the same reply.
  if (!res.ok && RETRY_AS_POST_STATUSES.has(res.status)) {
    res = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "create-token": createToken,
      },
      body: JSON.stringify({ username: username.trim(), password }),
    });
  }

  const data = await jsonOrThrow(res, "Invalid username or password");

  if (data?.status === "otp_required") {
    return {
      result: LOGIN_RESULT.OTP_REQUIRED,
      challengeToken: data.challengeToken,
      emailMasked: data.emailMasked || "",
      message: data.message || "",
    };
  }

  // Legacy gateway: already authenticated.
  //
  // `secret` MUST be carried through. The legacy `token` header is
  // `btoa(JSON.stringify(loginObject))`, and the gateway reads the Espo token
  // AND secret back out of it to call the CRM. Dropping the secret here would
  // produce a wrapper that looks structurally valid but authenticates against
  // nothing — every request after sign-in would come back 401.
  if (data?.token) {
    return {
      result: LOGIN_RESULT.AUTHENTICATED,
      token: data.token,
      secret: data.secret,
      user: data.user,
      acl: data.acl || null,
    };
  }

  throw new Error(data?.error || data?.message || "Login failed");
};

/**
 * Step 2 — exchange the OTP for the 30-day session token.
 *
 * The OTP is stripped to digits because the 6-box input lets a pasted code
 * arrive with spaces or dashes ("123 456"), which the gateway would reject as
 * an incorrect code rather than as malformed input.
 */
export const verifyOtp = async (otp, challengeToken) => {
  const res = await fetch(`${AUTH_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      otp: String(otp).replace(/\D/g, ""),
      challengeToken,
    }),
  });

  const data = await jsonOrThrow(res, "Could not verify that code");

  if (data?.status !== "success" || !data?.token) {
    throw new Error(data?.error || "Could not verify that code");
  }
  return data.token;
};

/**
 * Resend the OTP, which also resets the 15-minute window.
 *
 * Returns the NEW challenge token. The old one stops working, so a caller that
 * keeps using it would see "Invalid or corrupted challenge token" on the next
 * verify — the integration guide calls this out specifically.
 */
export const resendOtp = async (challengeToken) => {
  const res = await fetch(`${AUTH_URL}/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ challengeToken }),
  });

  const data = await jsonOrThrow(res, "Could not resend the code");

  if (!data?.challengeToken) {
    throw new Error(data?.error || "Could not resend the code");
  }
  return {
    challengeToken: data.challengeToken,
    emailMasked: data.emailMasked || "",
    message: data.message || "",
  };
};

/**
 * Loads the signed-in user and their ACL using a verified session token.
 *
 * NEEDED BECAUSE the 2FA endpoints return a token and nothing else — no user,
 * no ACL. The integration guide treats that as sufficient ("normal CRM data
 * fetching is completely unchanged"), but this app cannot run on a token
 * alone: `login_object` and `acl` drive ProtectedRoute, RoleGuard,
 * `permission.js`, the `aajneeti` contact-masking, and the per-user cache
 * keys. Without them a verified user would be let in with no role and no
 * permissions, every ACL-gated read would come back empty, and it would look
 * exactly like "my data is not loading".
 *
 * `/App/user` is named twice in the integration guide as a standard endpoint
 * that works unchanged with the session token, which is what makes this safe.
 */
export const loadSessionUser = async (sessionToken) => {
  const res = await fetch(`${API_BASE_URL}/App/user`, {
    method: "GET",
    headers: { "Content-Type": "application/json", token: sessionToken },
  });

  const data = await jsonOrThrow(res, "Signed in, but could not load your profile");

  const user = data?.user || data;
  if (!user?.id) {
    throw new Error("Signed in, but could not load your profile");
  }
  return { user, acl: data?.acl || null };
};

/**
 * Builds the `login_object` the rest of the app reads.
 *
 * Kept identical to what the legacy login produced, field for field, so that
 * nothing downstream can tell which flow created the session. `token` holds
 * whatever the session token is for that flow.
 */
export const buildLoginObject = ({ user, acl, token, secret }) => {
  const rolesNamesMap = user?.rolesNames || {};
  const roles = Object.values(rolesNamesMap || {});

  return {
    id: user.id,
    username: user.userName,
    token,
    secret,
    type: user.type,
    acl: acl || null,
    rolesIds: user.rolesIds || [],
    rolesNames: rolesNamesMap,
    roles,
    role: roles?.[0] || "",
    teamsIds: user.teamsIds?.length
      ? user.teamsIds
      : user.teamIds?.length
        ? user.teamIds
        : user.defaultTeamId
          ? [user.defaultTeamId]
          : [],
    teamId: user.teamId || user.defaultTeamId || null,
    assignedUserId: user.id,
  };
};

/**
 * Fills in role names when the login payload omitted them.
 *
 * `rolesNames` drives every `Roles: Owner` gate in the app, and neither
 * `/auth` nor `/App/user` is guaranteed to include it. Failure is deliberately
 * non-fatal: a session with no role names is still a usable session, just one
 * where role-gated sections stay hidden, which is the safe direction to fail.
 */
export const enrichUser = async (user, token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/User/${user.id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", token },
    });
    if (!res.ok) return user;
    const full = await res.json();
    return { ...user, ...full };
  } catch {
    return user;
  }
};

/** Caches this app owns and can always rebuild from the server. */
const REBUILDABLE_CACHE_PREFIXES = [
  "leads_count_cache_",
  "users_cache_",
  "teams_cache_",
  "win_rate_dataset_",
  "project_options_",
];

/**
 * Commits the session to localStorage.
 *
 * Guarded, because these writes share one storage quota with every cache the
 * app keeps. When storage is full a bare sequence of setItem calls throws PART
 * WAY THROUGH, which is the worst outcome available: `auth_token` and
 * `login_object` land, `acl` (the largest) does not, and the user is "logged
 * in" with no permissions at all.
 *
 * So on failure: drop the app's own caches, which are all re-derivable, and
 * retry once. Only then give up — and with a message that names the real
 * problem instead of pretending the credentials were wrong.
 *
 * @returns {boolean} true on success; false means storage is genuinely full.
 */
export const persistSession = ({ token, loginObject, acl }) => {
  const write = () => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("login_object", JSON.stringify(loginObject));
    localStorage.setItem("isAuthenticated", "true");
    if (acl) localStorage.setItem("acl", JSON.stringify(acl));
  };

  try {
    write();
    return true;
  } catch {
    try {
      Object.keys(localStorage)
        .filter((k) => REBUILDABLE_CACHE_PREFIXES.some((p) => k.startsWith(p)))
        .forEach((k) => localStorage.removeItem(k));
      write();
      return true;
    } catch {
      return false;
    }
  }
};
