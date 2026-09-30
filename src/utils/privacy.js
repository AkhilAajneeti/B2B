/**
 * Contact-detail masking for restricted users.
 *
 * Used together with `isMaskedUser()` from utils/permission: that decides WHO
 * gets masked, these decide WHAT they see. Read the warning on
 * `MASKED_ROLE_NAMES` there before relying on this for anything that matters —
 * it is a display mask, not access control.
 *
 * The masked string is built BEFORE render, so the real digits never enter the
 * DOM. That's the difference from a CSS blur, where the value is present in the
 * markup and one class toggle in DevTools reveals it.
 */

/** Shown wherever a value is withheld entirely rather than partially masked. */
export const HIDDEN_PLACEHOLDER = "Hidden";

/**
 * "+919876543210" → "+91 98******10"
 *
 * Keeps the country code (when the number was written with one), the first two
 * and the last two digits of the national part; everything between becomes
 * asterisks, one per hidden digit so the length still reads correctly.
 *
 * Numbers too short to mask meaningfully (4 digits or fewer of national part)
 * are hidden completely rather than half-revealed.
 */
export const maskPhoneNumber = (raw) => {
  if (raw === null || raw === undefined) return "";
  const str = String(raw).trim();
  if (!str) return "";

  const digits = str.replace(/\D/g, "");
  if (!digits) return "";

  // Splitting off the country code by regex alone is ambiguous: `^\+(\d{1,3})`
  // is greedy, so "+919876543210" yielded a "919" country code and shifted the
  // whole mask by a digit. Length is the reliable signal instead — national
  // numbers here are 10 digits, so anything beyond that at the front IS the
  // country code. Short or malformed numbers fall back to the way the string
  // was written (a separator after the +NN), and failing that get no split.
  let ccLen = 0;
  if (str.startsWith("+")) {
    if (digits.length > 10) {
      ccLen = Math.min(digits.length - 10, 3);
    } else {
      const grouped = str.match(/^\+(\d{1,3})[\s-]/);
      ccLen = grouped ? grouped[1].length : 0;
    }
  }

  const cc = ccLen ? `+${digits.slice(0, ccLen)} ` : "";
  const national = digits.slice(ccLen);

  // Too short to show two digits at each end without revealing most of it.
  if (national.length <= 4) return `${cc}${"*".repeat(national.length)}`.trim();

  return `${cc}${national.slice(0, 2)}${"*".repeat(national.length - 4)}${national.slice(-2)}`;
};

/**
 * Phone for display: masked or not, decided by the caller's `masked` flag so
 * components don't each have to remember to call `isMaskedUser()`.
 * Returns "" for an empty input so callers' existing "—" fallbacks still work.
 */
export const displayPhone = (raw, masked) =>
  masked ? maskPhoneNumber(raw) : raw || "";

/**
 * Email is withheld outright rather than partially masked — a masked local part
 * plus a visible domain is often enough to guess the address.
 * Returns "" for an empty input so existing empty-state fallbacks still apply.
 */
export const displayEmail = (raw, masked) => {
  if (!raw) return "";
  return masked ? HIDDEN_PLACEHOLDER : raw;
};
