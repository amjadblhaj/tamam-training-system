"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { generatePlaceholderPasswordHash } from "@/lib/auth/generate-placeholder-password";
import { revokeAllSessionsForSubject } from "@/lib/auth/session-store";
import { getScope, getBranchFilter, assertBranchAccess } from "@/lib/auth/scope";
import { createStudentSchema, type CreateStudentInput } from "@/lib/validations/student";
import { STUDENTS_PAGE_SIZE } from "@/lib/constants";
import { relationValue } from "@/lib/supabase/relation";
import { recordAuditLog } from "@/lib/audit";
import type {
  StudentRow,
  StudentDetail,
  PointsLogEntry,
  RedemptionEntry,
  GetStudentsParams,
  GetStudentsResult,
  ActionResult,
  CreateStudentResult,
} from "@/types";

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

export async function getStudents(params: GetStudentsParams): Promise<GetStudentsResult> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return { students: [], total: 0, page: 1, pageSize: STUDENTS_PAGE_SIZE };

  const db = getSupabaseAdmin();
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * STUDENTS_PAGE_SIZE;
  const to = from + STUDENTS_PAGE_SIZE - 1;

  let query = db
    .from("students")
    .select("id, full_name, phone, branch_id, student_code, points, active, joined_at, branches(name_ar)", {
      count: "exact",
    })
    .eq("tenant_id", scope.tenantId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  const branchFilter = getBranchFilter(scope, params.branchId);
  if (branchFilter) query = query.eq("branch_id", branchFilter);

  const safeSearch = params.search ? sanitizeSearchTerm(params.search) : "";
  if (safeSearch)
    query = query.or(`full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,student_code.ilike.%${safeSearch}%`);

  const { data, count } = await query;

  const students: StudentRow[] = (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    phone: s.phone,
    branch_id: s.branch_id,
    branch_name_ar: relationValue<string>(s.branches, "name_ar") ?? "",
    student_code: s.student_code,
    points: s.points,
    active: s.active,
    joined_at: s.joined_at,
  }));

  return { students, total: count ?? 0, page, pageSize: STUDENTS_PAGE_SIZE };
}

export async function getStudentById(id: number): Promise<StudentDetail | null> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return null;

  const db = getSupabaseAdmin();
  let query = db
    .from("students")
    .select(
      "id, full_name, phone, branch_id, student_code, points, active, joined_at, created_at, branches(name_ar)"
    )
    .eq("id", id)
    .eq("tenant_id", scope.tenantId);
  if (scope.role === "staff") query = query.eq("branch_id", scope.branchId);

  const { data } = await query.maybeSingle();
  if (!data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    phone: data.phone,
    branch_id: data.branch_id,
    branch_name_ar: relationValue<string>(data.branches, "name_ar") ?? "",
    student_code: data.student_code,
    points: data.points,
    active: data.active,
    joined_at: data.joined_at,
    created_at: data.created_at,
  };
}

export async function getStudentPointsHistory(id: number): Promise<PointsLogEntry[]> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return [];

  const db = getSupabaseAdmin();
  let query = db
    .from("points_log")
    .select("*")
    .eq("student_id", id)
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false });
  if (scope.role === "staff") query = query.eq("branch_id", scope.branchId);

  const { data } = await query;
  return data ?? [];
}

export async function getStudentRedemptions(id: number): Promise<RedemptionEntry[]> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return [];

  // redemptions has no branch_id column of its own — verify the student's
  // branch directly before returning anything for a staff caller.
  if (scope.role === "staff") {
    try {
      await assertBranchAccess(scope, id);
    } catch {
      return [];
    }
  }

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("redemptions")
    .select("id, reward_id, status, redeemed_at, rewards(name_ar)")
    .eq("student_id", id)
    .eq("tenant_id", scope.tenantId)
    .order("redeemed_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    reward_id: r.reward_id,
    reward_name_ar: relationValue<string>(r.rewards, "name_ar") ?? "",
    status: r.status,
    redeemed_at: r.redeemed_at,
  }));
}

export async function createStudent(input: CreateStudentInput): Promise<CreateStudentResult> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const parsed = createStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { fullName, phone } = parsed.data;

  // Staff can only ever add students to their own branch — never trust the
  // client-submitted branchId for them, even if the form somehow sent one.
  const branchId = scope.role === "staff" ? scope.branchId : parsed.data.branchId;
  if (!branchId) return { success: false, error: "الفرع مطلوب" };

  const db = getSupabaseAdmin();

  const { data: canAdd } = await db.rpc("can_add_student", { p_tenant_id: scope.tenantId });
  if (!canAdd?.allowed) {
    return { success: false, error: "تم الوصول للحد الأقصى لعدد الطلاب المسموح به في خطتك" };
  }

  const { data: existing } = await db
    .from("students")
    .select("id")
    .eq("phone", phone)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();
  if (existing) {
    return { success: false, error: "رقم الهاتف مستخدم بالفعل" };
  }

  const { data: codeResult, error: codeError } = await db.rpc("generate_student_code", {
    p_tenant_id: scope.tenantId,
    p_branch_id: branchId,
  });
  if (codeError || !codeResult?.success) {
    return { success: false, error: codeResult?.error ?? "تعذر توليد كود الطالب" };
  }

  const hashed = await generatePlaceholderPasswordHash();
  const { error } = await db.from("students").insert({
    full_name: fullName,
    phone,
    branch_id: branchId,
    student_code: codeResult.code,
    student_sequence: codeResult.sequence,
    password: hashed,
    tenant_id: scope.tenantId,
  });

  if (error) {
    return { success: false, error: "حدث خطأ أثناء إضافة الطالب" };
  }

  return { success: true, studentCode: codeResult.code as string };
}

// Cross-branch moves are an admin-only operation — staff are confined to
// their own branch and can't reassign a student out of (or into) it.
export async function transferStudent(id: number, newBranchId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.role !== "admin") return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const db = getSupabaseAdmin();

  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("id", newBranchId)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  if (!branch) return { success: false, error: "الفرع غير موجود" };

  // Points, reward/redemption history, and points_log are keyed by student_id,
  // not branch_id — updating branch_id alone preserves all of it. The
  // student_code deliberately keeps its original branch digit — codes are
  // permanent identifiers, not re-issued on transfer.
  const { error } = await db
    .from("students")
    .update({ branch_id: newBranchId })
    .eq("id", id)
    .eq("tenant_id", session.tenantId);

  if (error) return { success: false, error: "حدث خطأ أثناء نقل الطالب" };
  return { success: true };
}

export async function deactivateStudent(id: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  try {
    await assertBranchAccess(scope, id);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "غير مصرح" };
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("students")
    .update({ active: false })
    .eq("id", id)
    .eq("tenant_id", scope.tenantId);
  if (error) {
    return { success: false, error: "حدث خطأ ما" };
  }

  await revokeAllSessionsForSubject("student", String(id));
  await recordAuditLog({
    tenantId: scope.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "student_deactivated",
    entity: "student",
    entityId: String(id),
  });

  return { success: true };
}
