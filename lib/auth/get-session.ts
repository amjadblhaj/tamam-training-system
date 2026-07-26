import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/auth/session";
import { isSessionValid } from "@/lib/auth/session-store";

/**
 * The authoritative session check for Server Components/Actions: verifies
 * the JWT AND that it hasn't been revoked server-side (logout, password
 * change) or expired early. `middleware.ts` only does the JWT-only check
 * (see `verifySessionToken`'s docs) for routing speed — this is the check
 * that actually gates data access.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  const valid = await isSessionValid(session.sessionId);
  if (!valid) return null;

  return session;
}
