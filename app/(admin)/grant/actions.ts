"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { grantPointsSchema, GRANT_REASONS, type GrantPointsInput } from "@/lib/validations/points";
import { relationValue } from "@/lib/supabase/relation";
import type { StudentSearchResult, GrantPointsResult } from "@/types";

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

export async function searchStudentsForGrant(query: string): Promise<StudentSearchResult[]> {
  const session = await getSession();
  if (!session) return [];

  const safe = sanitizeSearchTerm(query);
  if (!safe) return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("id, full_name, phone, points, branches(name_ar)")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`)
    .limit(10);

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    points: s.points,
    branch_name_ar: relationValue<string>(s.branches, "name_ar") ?? "",
  }));
}

export async function grantPoints(input: GrantPointsInput): Promise<GrantPointsResult> {
  const session = await getSession();
  if (!session || session.role === "student") {
    return { success: false, error: "غير مصرح" };
  }

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const parsed = grantPointsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { studentId, points, reason, customReason } = parsed.data;

  const preset = GRANT_REASONS.find((r) => r.value === reason);
  const action = reason === "custom" ? customReason!.trim() : (preset?.action ?? reason);

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("grant_points_v2", {
    p_tenant_id: session.tenantId,
    p_student_id: studentId,
    p_points: points,
    p_action: action,
    p_type: "grant",
    p_granted_by: session.name,
    p_note: null,
  });

  if (error || !data?.success) {
    return { success: false, error: "حدث خطأ أثناء منح النقاط" };
  }

  return {
    success: true,
    studentName: data.student_name,
    newBalance: data.new_balance,
  };
}
