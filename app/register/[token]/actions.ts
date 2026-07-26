"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { startSession } from "@/lib/auth/start-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { checkLoginRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { generatePlaceholderPasswordHash } from "@/lib/auth/generate-placeholder-password";
import { registerStudentSchema, type RegisterStudentInput } from "@/lib/validations/register";
import { RATE_LIMIT_SCOPE } from "@/lib/constants";
import { relationValue } from "@/lib/supabase/relation";
import type { LoginResult } from "@/lib/validations/auth";
import type { BranchPublicInfo } from "@/types";

export async function getBranchByToken(token: string): Promise<BranchPublicInfo | null> {
  const db = getSupabaseAdmin();
  const { data: branch } = await db
    .from("branches")
    .select("id, name_ar, active, tenant_id, tenants(academy_name)")
    .eq("registration_token", token)
    .maybeSingle();

  if (!branch || !branch.active) return null;

  return {
    id: branch.id,
    name_ar: branch.name_ar,
    tenantId: branch.tenant_id,
    academyName: relationValue<string>(branch.tenants, "academy_name") ?? "",
  };
}

export async function registerStudent(token: string, input: RegisterStudentInput): Promise<LoginResult> {
  if (!(await checkLoginRateLimit(`${RATE_LIMIT_SCOPE.REGISTER}:${getClientIp()}`))) {
    return { success: false, error: "محاولات كثيرة جدًا. حاول مرة أخرى بعد دقيقة." };
  }

  const parsed = registerStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { fullName, phone, email } = parsed.data;

  const db = getSupabaseAdmin();

  // The token identifies the branch/tenant server-side — never trust a
  // client-supplied branch or tenant id for a public, unauthenticated action.
  const { data: branch } = await db
    .from("branches")
    .select("id, tenant_id, active")
    .eq("registration_token", token)
    .maybeSingle();

  if (!branch || !branch.active) {
    return { success: false, error: "رابط التسجيل غير صالح" };
  }

  const writeCheck = await assertTenantCanWrite(branch.tenant_id);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const { data: canAdd } = await db.rpc("can_add_student", { p_tenant_id: branch.tenant_id });
  if (!canAdd?.allowed) {
    return { success: false, error: "لا يمكن التسجيل حاليًا — تم الوصول للحد الأقصى لعدد الطلاب" };
  }

  const { data: existing } = await db
    .from("students")
    .select("id")
    .eq("phone", phone)
    .eq("tenant_id", branch.tenant_id)
    .maybeSingle();
  if (existing) {
    return { success: false, error: "رقم الهاتف مسجل بالفعل" };
  }

  const hashed = await generatePlaceholderPasswordHash();
  const { data: student, error } = await db
    .from("students")
    .insert({
      full_name: fullName,
      phone,
      email,
      branch_id: branch.id,
      password: hashed,
      tenant_id: branch.tenant_id,
    })
    .select("id")
    .single();

  if (error || !student) {
    return { success: false, error: "حدث خطأ أثناء التسجيل" };
  }

  await startSession({
    id: String(student.id),
    role: "student",
    name: fullName,
    branchId: branch.id,
    tenantId: branch.tenant_id,
  });

  return { success: true, redirectTo: "/portal" };
}
