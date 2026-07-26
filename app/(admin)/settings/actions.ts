"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllSessionsForSubject } from "@/lib/auth/session-store";
import { recordAuditLog } from "@/lib/audit";
import { createStaffSchema, type CreateStaffInput } from "@/lib/validations/staff";
import { relationValue } from "@/lib/supabase/relation";
import type { StaffRow, ActionResult } from "@/types";

async function requireAdminWriteAccess() {
  const session = await getSession();
  if (session?.role !== "admin") return { session: null, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { session: null, error: writeCheck.error };

  return { session, error: undefined };
}

export async function getStaffList(): Promise<StaffRow[]> {
  const session = await getSession();
  if (!session || session.role !== "admin") return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("staff")
    .select("id, username, role, branch_id, active, branches(name_ar)")
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => ({
    id: s.id,
    username: s.username,
    role: s.role,
    branch_id: s.branch_id,
    branch_name_ar: relationValue<string>(s.branches, "name_ar"),
    active: s.active,
  }));
}

export async function createStaff(input: CreateStaffInput): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { username, password, branchId, role } = parsed.data;
  const branchIdNum = branchId ? Number(branchId) : null;

  const db = getSupabaseAdmin();
  // Usernames are globally unique (login looks staff up by username alone,
  // before the tenant is known), so this check is intentionally NOT
  // tenant-scoped — it matches the DB's UNIQUE(username) constraint.
  const { data: existing } = await db.from("staff").select("id").eq("username", username).maybeSingle();
  if (existing) {
    return { success: false, error: "اسم المستخدم مستخدم بالفعل" };
  }

  const hashed = await hashPassword(password);
  const { error } = await db.from("staff").insert({
    username,
    password: hashed,
    branch_id: branchIdNum,
    role,
    tenant_id: session.tenantId,
  });

  if (error) return { success: false, error: "حدث خطأ أثناء إضافة الموظف" };

  await recordAuditLog({
    tenantId: session.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "staff_created",
    entity: "staff",
    metadata: { username, role },
  });

  return { success: true };
}

export async function toggleStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

  if (session.id === id) {
    return { success: false, error: "لا يمكنك إلغاء تفعيل حسابك الخاص" };
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("staff").update({ active }).eq("id", id).eq("tenant_id", session.tenantId);
  if (error) return { success: false, error: "حدث خطأ ما" };

  // A deactivated staff account shouldn't keep working from an existing
  // session until it naturally expires.
  if (!active) await revokeAllSessionsForSubject("staff", id);

  return { success: true };
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

  if (session.id === id) {
    return { success: false, error: "لا يمكنك حذف حسابك الخاص" };
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("staff").delete().eq("id", id).eq("tenant_id", session.tenantId);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف الموظف" };

  await revokeAllSessionsForSubject("staff", id);
  await recordAuditLog({
    tenantId: session.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "staff_deleted",
    entity: "staff",
    entityId: id,
  });

  return { success: true };
}
