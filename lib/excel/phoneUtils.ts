import { PHONE_REGEX } from "@/lib/constants";

/**
 * Normalizes a raw Excel cell value into the same phone format the rest of
 * the app stores/validates (10 digits, no country code, no separators) —
 * strips whitespace/dashes/plus signs, converts Arabic-Indic digits to
 * Latin, and rewrites a leading Libyan country code (218) to the local 0.
 */
export function normalizePhone(raw: unknown): string {
  let phone = String(raw ?? "")
    .replace(/[\s\-+]/g, "")
    .trim();
  phone = phone.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  if (phone.startsWith("218")) phone = "0" + phone.slice(3);
  return phone;
}

/** Matches the same 10-digit rule enforced on `students.phone` elsewhere in the app. */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}
