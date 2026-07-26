import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/auth/rate-limit";
import { logger } from "@/lib/logger";

interface RecordAuditLogInput {
  tenantId: string | null;
  actor: string;
  actorRole: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records a sensitive action to `audit_log`. Best-effort: a logging failure
 * is logged itself and swallowed rather than failing the action it's
 * auditing — the action already succeeded (or is a login attempt) by the
 * time this is called, and losing an audit row is preferable to breaking
 * the underlying feature.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("audit_log").insert({
    tenant_id: input.tenantId,
    actor: input.actor,
    actor_role: input.actorRole,
    action: input.action,
    entity: input.entity ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ip_address: getClientIp(),
  });
  if (error) logger.error("recordAuditLog failed", error);
}
