"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
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

function clientIp() {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function loginStaff(input: StaffLoginInput): Promise<LoginResult> {
  if (!checkLoginRateLimit(`staff:${clientIp()}`)) {
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
    return { success: false, error: GENERIC_STAFF_ERROR };
  }

  const valid = await bcrypt.compare(password, staff.password);
  if (!valid) {
    return { success: false, error: GENERIC_STAFF_ERROR };
  }

  const token = await createSessionToken({
    id: staff.id,
    role: staff.role === "admin" ? "admin" : "staff",
    name: staff.username,
    branchId: staff.branch_id,
    tenantId: staff.tenant_id,
  });
  setSessionCookie(token);

  return { success: true, redirectTo: "/dashboard" };
}

export async function loginStudent(input: StudentLoginInput): Promise<LoginResult> {
  if (!checkLoginRateLimit(`student:${clientIp()}`)) {
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
    return { success: false, error: GENERIC_STUDENT_ERROR };
  }

  const token = await createSessionToken({
    id: String(student.id),
    role: "student",
    name: student.full_name,
    branchId: student.branch_id,
    tenantId: student.tenant_id,
  });
  setSessionCookie(token);

  return { success: true, redirectTo: "/portal" };
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
