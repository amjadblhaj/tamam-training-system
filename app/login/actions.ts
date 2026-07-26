"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { startSession } from "@/lib/auth/start-session";
import { getSession } from "@/lib/auth/get-session";
import { revokeSession } from "@/lib/auth/session-store";
import { checkLoginRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { comparePassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { RATE_LIMIT_SCOPE } from "@/lib/constants";
import {
  staffLoginSchema,
  studentLoginSchema,
  type StaffLoginInput,
  type StudentLoginInput,
  type LoginResult,
} from "@/lib/validations/auth";

const GENERIC_STAFF_ERROR = "اسم المستخدم أو كلمة المرور غير صحيحة";
const GENERIC_STUDENT_ERROR = "رقم الهاتف غير مسجل";
const RATE_LIMIT_ERROR = "محاولات تسجيل دخول كثيرة جدًا. حاول مرة أخرى بعد دقيقة.";

export async function loginStaff(input: StaffLoginInput): Promise<LoginResult> {
  if (!(await checkLoginRateLimit(`${RATE_LIMIT_SCOPE.STAFF_LOGIN}:${getClientIp()}`))) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

  const parsed = staffLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? GENERIC_STAFF_ERROR };
  }
  const { username, password } = parsed.data;

  const { data: staff } = await getSupabaseAdmin()
    .from("staff")
    .select("id, username, password, role, branch_id, active, tenant_id")
    .eq("username", username)
    .maybeSingle();

  if (!staff || !staff.active) {
    await recordAuditLog({
      tenantId: staff?.tenant_id ?? null,
      actor: username,
      actorRole: "staff",
      action: "login_failed",
      metadata: { reason: !staff ? "not_found" : "inactive" },
    });
    return { success: false, error: GENERIC_STAFF_ERROR };
  }

  const valid = await comparePassword(password, staff.password);
  if (!valid) {
    await recordAuditLog({
      tenantId: staff.tenant_id,
      actor: username,
      actorRole: staff.role,
      action: "login_failed",
      metadata: { reason: "wrong_password" },
    });
    return { success: false, error: GENERIC_STAFF_ERROR };
  }

  await startSession({
    id: staff.id,
    role: staff.role === "admin" ? "admin" : "staff",
    name: staff.username,
    branchId: staff.branch_id,
    tenantId: staff.tenant_id,
  });

  await recordAuditLog({
    tenantId: staff.tenant_id,
    actor: username,
    actorRole: staff.role,
    action: "login_succeeded",
  });

  return { success: true, redirectTo: "/dashboard" };
}

export async function loginStudent(input: StudentLoginInput): Promise<LoginResult> {
  if (!(await checkLoginRateLimit(`${RATE_LIMIT_SCOPE.STUDENT_LOGIN}:${getClientIp()}`))) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

  const parsed = studentLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? GENERIC_STUDENT_ERROR };
  }
  const { phone } = parsed.data;

  // Phone-only login — no password check. This is an intentional, explicit
  // tradeoff for this loyalty program (confirmed with the client): anyone
  // who knows a student's phone number can access that student's account.
  const { data: student } = await getSupabaseAdmin()
    .from("students")
    .select("id, full_name, branch_id, active, tenant_id")
    .eq("phone", phone)
    .maybeSingle();

  if (!student || !student.active) {
    await recordAuditLog({
      tenantId: student?.tenant_id ?? null,
      actor: phone,
      actorRole: "student",
      action: "login_failed",
      metadata: { reason: !student ? "not_found" : "inactive" },
    });
    return { success: false, error: GENERIC_STUDENT_ERROR };
  }

  await startSession({
    id: String(student.id),
    role: "student",
    name: student.full_name,
    branchId: student.branch_id,
    tenantId: student.tenant_id,
  });

  await recordAuditLog({
    tenantId: student.tenant_id,
    actor: student.full_name,
    actorRole: "student",
    action: "login_succeeded",
    entity: "student",
    entityId: String(student.id),
  });

  return { success: true, redirectTo: "/portal" };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    await revokeSession(session.sessionId);
  }
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
