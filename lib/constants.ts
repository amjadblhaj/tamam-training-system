/** bcrypt cost factor used for every password hash in the app. */
export const BCRYPT_COST = 12;

/** Regex for a local phone number used as the student login/identity key. */
export const PHONE_REGEX = /^\d{10}$/;
export const PHONE_REGEX_MESSAGE = "رقم الهاتف يجب أن يتكون من 10 أرقام";

/** Row-count page sizes for paginated admin lists. Intentionally distinct per list. */
export const STUDENTS_PAGE_SIZE = 20;
export const ACTIVITY_PAGE_SIZE = 50;
export const REDEMPTIONS_PAGE_SIZE = 20;

/** Bounds how many transactions can be undone in a single bulk-undo request. */
export const MAX_BULK_UNDO = 100;

/**
 * Support/sales WhatsApp contact, in international format (Libya, +218).
 * `SUPPORT_PHONE_LOCAL` is the human-readable local form shown in the UI.
 */
export const SUPPORT_WHATSAPP_NUMBER = "218943643738";
export const SUPPORT_PHONE_LOCAL = "0943643738";

/** How long a "copied!" affordance stays visible before reverting. */
export const COPY_FEEDBACK_MS = 2000;

/** How long a toast stays on screen before auto-dismissing. */
export const TOAST_DURATION_MS = 4000;

/** Keys namespacing the login rate limiter (see lib/auth/rate-limit.ts). */
export const RATE_LIMIT_SCOPE = {
  STAFF_LOGIN: "staff",
  STUDENT_LOGIN: "student",
  REGISTER: "register",
  SUPER_ADMIN_LOGIN: "super-admin",
} as const;

/** Session lifetimes, per role (see lib/auth/session.ts / super-admin-session.ts). */
export const STAFF_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours
export const STUDENT_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 4 * 60 * 60; // 4 hours — shorter, higher-privilege role
