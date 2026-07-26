import "server-only";
import { cookies } from "next/headers";
import { createSessionToken, SESSION_MAX_AGE_SECONDS, type SessionPayload } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/set-session-cookie";
import {
  createSuperAdminSessionToken,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  type SuperAdminSessionPayload,
} from "@/lib/auth/super-admin-session";
import { createSessionRecord } from "@/lib/auth/session-store";
import { getClientIp } from "@/lib/auth/rate-limit";

type StartSessionInput = Omit<SessionPayload, "sessionId">;
type StartSuperAdminSessionInput = Omit<SuperAdminSessionPayload, "sessionId">;

/**
 * Issues a new tenant (staff/student) session end-to-end: generates the
 * session id, signs the JWT, records it server-side (for later revocation),
 * and sets the cookie. Every tenant login flow (staff, student, student
 * self-registration) goes through this so none of them can drift out of
 * sync with each other.
 */
export async function startSession(payload: StartSessionInput): Promise<void> {
  const sessionId = crypto.randomUUID();
  const token = await createSessionToken({ ...payload, sessionId });
  await createSessionRecord({
    sessionId,
    subjectType: payload.role === "student" ? "student" : "staff",
    subjectId: payload.id,
    tenantId: payload.tenantId,
    maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
    ip: getClientIp(),
  });
  setSessionCookie(token);
}

/** Super Admin equivalent of `startSession` — separate session system, see super-admin-session.ts. */
export async function startSuperAdminSession(payload: StartSuperAdminSessionInput): Promise<void> {
  const sessionId = crypto.randomUUID();
  const token = await createSuperAdminSessionToken({ ...payload, sessionId });
  await createSessionRecord({
    sessionId,
    subjectType: "super_admin",
    subjectId: payload.id,
    tenantId: null,
    maxAgeSeconds: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
    ip: getClientIp(),
  });
  cookies().set(SUPER_ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}
