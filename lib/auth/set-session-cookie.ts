import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

/**
 * Sets the tenant (staff/student) session cookie.
 * Kept out of `lib/auth/session.ts` deliberately — that module is imported by
 * `middleware.ts` (Edge runtime), which cannot use `next/headers`'s `cookies()`.
 */
export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}
