// Contact normalization. Used for matching new vs returning (never by name alone).
export function normalizeEmail(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254 ? s : undefined; // undefined = invalid
}

/** US-first: 10 digits → +1XXXXXXXXXX; accepts +1, spaces, dashes, dots, parens. */
export function normalizePhone(v) {
  if (v == null || v === "") return null;
  const digits = String(v).replace(/[^\d+]/g, "");
  const d = digits.replace(/^\+/, "");
  if (/^1\d{10}$/.test(d)) return "+" + d;
  if (/^\d{10}$/.test(d)) return "+1" + d;
  if (digits.startsWith("+") && /^\d{8,15}$/.test(d)) return "+" + d;
  return undefined;
}

export const cleanText = (v, max = 2000) =>
  v == null ? null : String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) || null;
