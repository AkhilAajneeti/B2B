/**
 * Phone number normalisation for outbound actions.
 *
 * Dialling and WhatsApp want DIFFERENT shapes, which is the trap this file
 * exists to document:
 *
 *   dialler  → national digits, or full E.164 WITH the leading "+"
 *   wa.me    → full international digits WITHOUT a "+"
 *
 * Stripping every non-digit works for WhatsApp and breaks the dialler: it
 * removes the "+" but leaves the country code, so "+919876543210" becomes
 * "919876543210" — twelve digits that are neither a valid local number nor a
 * valid international one. That's what made the call button fail to connect.
 */

/**
 * A number the device dialler can actually place.
 *
 *   "+91 98765 43210"  → "9876543210"   (country code dropped)
 *   "919876543210"     → "9876543210"
 *   "09876543210"      → "9876543210"   (trunk prefix dropped)
 *   "9876543210"       → "9876543210"
 *   "+1 415 555 0132"  → "+14155550132" (not Indian — keep E.164)
 *
 * Indian numbers come back as the bare 10 digits, which is what local carriers
 * expect. Anything else that was written with a "+" keeps it, so an
 * international number still dials correctly instead of being mangled into a
 * local one.
 */
export const toDialNumber = (raw) => {
  if (!raw) return "";
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, "");
  if (!digits) return "";

  // 91 + 10 digits, with or without the "+".
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  // 091 + 10 digits.
  if (digits.length === 13 && digits.startsWith("091")) return digits.slice(3);
  // Domestic trunk prefix.
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  // Already a plain national number.
  if (digits.length === 10) return digits;

  // Unrecognised shape. If it was written as international, preserve that —
  // dropping the "+" here is exactly the bug above.
  return str.startsWith("+") ? `+${digits}` : digits;
};

/**
 * A number for a wa.me link: full international digits, no "+", no spaces.
 * Deliberately NOT `toDialNumber` — WhatsApp needs the country code that the
 * dialler wants removed.
 */
export const toWhatsappNumber = (raw) =>
  raw ? String(raw).replace(/\D/g, "") : "";
