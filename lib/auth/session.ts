import { SignJWT, jwtVerify } from "jose";
import { STAFF_SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export type SessionRole = "admin" | "staff" | "student";

export interface SessionPayload {
  id: string;
  role: SessionRole;
  name: string;
  branchId: number | null;
  tenantId: string;
  /** Ties this JWT to a row in the `sessions` table — see lib/auth/session-store.ts. */
  sessionId: string;
}

export const SESSION_COOKIE = "tamam_session";
/** Shared by staff and student sessions — both are 8 hours (see lib/constants.ts). */
export const SESSION_MAX_AGE_SECONDS = STAFF_SESSION_MAX_AGE_SECONDS;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Signs a tenant (staff/student) session JWT. Pair with `setSessionCookie` to actually log a user in. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verifies and decodes a tenant session JWT's signature and shape only.
 *
 * This does NOT check revocation — that requires a DB round trip, which this
 * function deliberately avoids so it stays safe to call from `middleware.ts`
 * (Edge runtime, no `next/headers`) for fast routing decisions. Server
 * Components/Actions must go through `lib/auth/get-session.ts`'s
 * `getSession()` instead, which additionally checks `isSessionValid()` — a
 * revoked or logged-out session can still pass this function's check for up
 * to its natural JWT expiry, but `getSession()` will correctly return `null`
 * for it immediately.
 * @returns The decoded session, or `null` if the token is invalid, expired, or malformed.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id === "string" &&
      typeof payload.role === "string" &&
      typeof payload.name === "string" &&
      typeof payload.tenantId === "string" &&
      typeof payload.sessionId === "string" &&
      (payload.branchId === null || typeof payload.branchId === "number")
    ) {
      return {
        id: payload.id,
        role: payload.role as SessionRole,
        name: payload.name,
        branchId: (payload.branchId as number | null) ?? null,
        tenantId: payload.tenantId,
        sessionId: payload.sessionId,
      };
    }
    return null;
  } catch {
    return null;
  }
}
