"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { comparePassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { createBranchSchema, type CreateBranchInput } from "@/lib/validations/branch";
import type { BranchLimitInfo, BranchWithStats, ActionResult } from "@/types";

export async function getBranchesWithStats(): Promise<BranchLimitInfo> {
  const session = await getSession();
  if (!session) return { branches: [], used: 0, max: 0 };

  const db = getSupabaseAdmin();

  const [{ data: branches }, { data: tenant }] = await Promise.all([
    db.from("branches").select("id, name_ar, active").eq("tenant_id", session.tenantId).order("id"),
    db.from("tenants").select("max_branches").eq("id", session.tenantId).maybeSingle(),
  ]);

  const branchList = branches ?? [];

  const branchesWithStats: BranchWithStats[] = await Promise.all(
    branchList.map(async (b) => {
      const { count } = await db
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("branch_id", b.id)
        .eq("tenant_id", session.tenantId)
        .eq("active", true);
      return { id: b.id, name_ar: b.name_ar, active: b.active, student_count: count ?? 0 };
    })
  );

  return {
    branches: branchesWithStats,
    used: branchList.length,
    max: tenant?.max_branches ?? 0,
  };
}

export async function createBranch(input: CreateBranchInput): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "غير مصرح — هذا الإجراء متاح للمدير فقط" };
  }

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const parsed = createBranchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const db = getSupabaseAdmin();

  const { data: canAdd } = await db.rpc("can_add_branch", { p_tenant_id: session.tenantId });
  if (!canAdd?.allowed) {
    return { success: false, error: "تم الوصول للحد الأقصى لعدد الفروع المسموح به في حسابك" };
  }

  // `name` is never displayed (only name_ar is) but has a UNIQUE constraint —
  // generate a unique internal value rather than deriving one from the
  // user-supplied Arabic name.
  const { error } = await db.from("branches").insert({
    name: `branch-${crypto.randomUUID()}`,
    name_ar: parsed.data.nameAr,
    tenant_id: session.tenantId,
  });

  if (error) return { success: false, error: "حدث خطأ أثناء إضافة الفرع" };
  return { success: true };
}

export async function deleteBranch(branchId: number, password: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { success: false, error: "غير مصرح — هذا الإجراء متاح للمدير فقط" };
  }

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  if (!password) {
    return { success: false, error: "يرجى إدخال كلمة المرور للتأكيد" };
  }

  const db = getSupabaseAdmin();

  const { data: staff } = await db.from("staff").select("password").eq("id", session.id).maybeSingle();
  if (!staff) return { success: false, error: "حدث خطأ ما" };

  const validPassword = await comparePassword(password, staff.password);
  if (!validPassword) {
    return { success: false, error: "كلمة المرور غير صحيحة" };
  }

  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("id", branchId)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  if (!branch) return { success: false, error: "الفرع غير موجود" };

  // students/staff.branch_id has no ON DELETE behavior (defaults to
  // RESTRICT) — check first so this fails with a clear Arabic message
  // instead of a raw foreign-key-violation error.
  const [{ count: studentCount }, { count: staffCount }] = await Promise.all([
    db.from("students").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
    db.from("staff").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
  ]);

  if ((studentCount ?? 0) > 0 || (staffCount ?? 0) > 0) {
    return { success: false, error: "لا يمكن حذف الفرع لوجود طلاب أو موظفين مرتبطين به" };
  }

  const { error } = await db.from("branches").delete().eq("id", branchId).eq("tenant_id", session.tenantId);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف الفرع" };

  await recordAuditLog({
    tenantId: session.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "branch_deleted",
    entity: "branch",
    entityId: String(branchId),
  });

  return { success: true };
}
