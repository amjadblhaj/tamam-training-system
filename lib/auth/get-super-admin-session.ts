import "server-only";
import { cookies } from "next/headers";
import {
  SUPER_ADMIN_SESSION_COOKIE,
  verifySuperAdminSessionToken,
  type SuperAdminSessionPayload,
} from "@/lib/auth/super-admin-session";
import { isSessionValid } from "@/lib/auth/session-store";

export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const token = cookies().get(SUPER_ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySuperAdminSessionToken(token);
  if (!session) return null;

  const valid = await isSessionValid(session.sessionId);
  if (!valid) return null;

  return session;
}
