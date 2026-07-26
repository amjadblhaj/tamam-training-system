import { SignJWT, jwtVerify } from "jose";
import { SUPER_ADMIN_SESSION_MAX_AGE_SECONDS as CONFIGURED_MAX_AGE } from "@/lib/constants";

export interface SuperAdminSessionPayload {
  id: string;
  username: string;
  /** Ties this JWT to a row in the `sessions` table — see lib/auth/session-store.ts. */
  sessionId: string;
}

export const SUPER_ADMIN_SESSION_COOKIE = "mazaya_sa_session";
// Shorter than the tenant staff/student session (8h) — this is the
// highest-privilege role on the platform, with access to every tenant.
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = CONFIGURED_MAX_AGE;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Signs a Super Admin session JWT. Deliberately separate from
 * `lib/auth/session.ts`'s tenant session — a completely independent
 * cookie/session system, never mixed with tenant staff/student auth.
 */
export async function createSuperAdminSessionToken(payload: SuperAdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SUPER_ADMIN_SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Verifies this JWT's signature and shape only — does not check revocation.
 * See `verifySessionToken` in `lib/auth/session.ts` for why (Edge-safe
 * routing check). `getSuperAdminSession()` is the authoritative check.
 */
export async function verifySuperAdminSessionToken(token: string): Promise<SuperAdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.id === "string" &&
      typeof payload.username === "string" &&
      typeof payload.sessionId === "string"
    ) {
      return { id: payload.id, username: payload.username, sessionId: payload.sessionId };
    }
    return null;
  } catch {
    return null;
  }
}
