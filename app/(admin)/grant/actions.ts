"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { getScope } from "@/lib/auth/scope";
import { grantPointsFieldsSchema, GRANT_REASONS, type GrantPointsFieldsInput } from "@/lib/validations/points";
import { relationValue } from "@/lib/supabase/relation";
import type { StudentSearchResult, GrantPointsBatchResult } from "@/types";

/** Bounds how many students a single manual-grant batch can target. */
const MAX_BATCH_GRANT_STUDENTS = 50;

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

export async function searchStudentsForGrant(query: string): Promise<StudentSearchResult[]> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return [];

  const safe = sanitizeSearchTerm(query);
  if (!safe) return [];

  const db = getSupabaseAdmin();
  let dbQuery = db
    .from("students")
    .select("id, full_name, phone, student_code, points, branches(name_ar)")
    .eq("tenant_id", scope.tenantId)
    .eq("active", true)
    .or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%,student_code.ilike.%${safe}%`)
    .limit(10);
  if (scope.role === "staff") dbQuery = dbQuery.eq("branch_id", scope.branchId);

  const { data } = await dbQuery;

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    student_code: s.student_code,
    points: s.points,
    branch_name_ar: relationValue<string>(s.branches, "name_ar") ?? "",
  }));
}

/**
 * Grants the same points + reason to one or more students in a single call
 * — a single-student call behaves identically to the old single-grant
 * action (one RPC call, one log entry), just reached through the same batch
 * path rather than a separate function. Branch ownership for every target
 * student is checked in one query before any RPC call runs, and a student
 * that fails (wrong branch, not found, RPC error) is reported individually
 * rather than failing the whole batch — the same partial-failure model used
 * for bulk undo and the Excel wizard.
 */
export async function grantPointsBatch(
  studentIds: number[],
  fields: GrantPointsFieldsInput
): Promise<GrantPointsBatchResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const parsed = grantPointsFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { points, reason, customReason } = parsed.data;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return { success: false, error: "يجب اختيار طالب واحد على الأقل" };
  }
  if (studentIds.length > MAX_BATCH_GRANT_STUDENTS) {
    return { success: false, error: `الحد الأقصى ${MAX_BATCH_GRANT_STUDENTS} طالب في المرة الواحدة` };
  }

  const preset = GRANT_REASONS.find((r) => r.value === reason);
  const action = reason === "custom" ? customReason!.trim() : (preset?.action ?? reason);

  const db = getSupabaseAdmin();

  const { data: students } = await db
    .from("students")
    .select("id, branch_id")
    .eq("tenant_id", scope.tenantId)
    .in("id", studentIds);
  const byId = new Map((students ?? []).map((s) => [s.id, s]));

  const failed: { studentId: number; error: string }[] = [];
  let grantedCount = 0;
  let totalPoints = 0;

  for (const studentId of studentIds) {
    const student = byId.get(studentId);
    if (!student) {
      failed.push({ studentId, error: "الطالب غير موجود" });
      continue;
    }
    if (scope.role === "staff" && student.branch_id !== scope.branchId) {
      failed.push({ studentId, error: "لا تملك صلاحية على طلاب فرع آخر" });
      continue;
    }

    const { data, error } = await db.rpc("grant_points_v2", {
      p_tenant_id: scope.tenantId,
      p_student_id: studentId,
      p_points: points,
      p_action: action,
      p_type: "grant",
      p_granted_by: session.name,
      p_note: null,
    });

    if (error || !data?.success) {
      failed.push({ studentId, error: "تعذر منح النقاط" });
      continue;
    }
    grantedCount++;
    totalPoints += points;
  }

  return { success: true, grantedCount, totalPoints, failed };
}
