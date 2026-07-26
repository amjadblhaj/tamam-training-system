import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type SessionSubjectType = "staff" | "student" | "super_admin";

interface CreateSessionRecordInput {
  sessionId: string;
  subjectType: SessionSubjectType;
  subjectId: string;
  tenantId: string | null;
  maxAgeSeconds: number;
  ip: string;
}

/**
 * Records a newly-issued session server-side, so it can later be revoked
 * (logout, password change) before its JWT would naturally expire. Call
 * this alongside `createSessionToken`/`createSuperAdminSessionToken`, using
 * the same `sessionId` embedded in the JWT.
 */
export async function createSessionRecord(input: CreateSessionRecordInput): Promise<void> {
  const db = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + input.maxAgeSeconds * 1000).toISOString();
  const { error } = await db.from("sessions").insert({
    id: input.sessionId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    tenant_id: input.tenantId,
    expires_at: expiresAt,
    created_by_ip: input.ip,
  });
  if (error) {
    // Login already succeeded and the JWT is already signed at this point —
    // failing to record it server-side would only break revocation, not the
    // login itself. Log and continue rather than failing the login.
    logger.error("createSessionRecord failed", error);
  }
}

/** True if `sessionId` refers to a session that hasn't been revoked or expired server-side. */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("sessions")
    .select("revoked_at, expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return false;
  if (data.revoked_at) return false;
  return new Date(data.expires_at) > new Date();
}

/** Revokes a single session immediately (e.g. on logout). */
export async function revokeSession(sessionId: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId);
}

/**
 * Revokes every active session for one subject (e.g. all of a staff
 * member's sessions, on password change) — everywhere they're logged in,
 * effective on their very next request.
 */
export async function revokeAllSessionsForSubject(
  subjectType: SessionSubjectType,
  subjectId: string
): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .is("revoked_at", null);
}
