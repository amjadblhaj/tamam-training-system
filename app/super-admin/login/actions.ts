"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  createSuperAdminSessionToken,
  SUPER_ADMIN_SESSION_COOKIE,
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/super-admin-session";
import { checkLoginRateLimit } from "@/lib/auth/rate-limit";
import {
  superAdminLoginSchema,
  type SuperAdminLoginInput,
  type SuperAdminLoginResult,
} from "@/lib/validations/super-admin";

const GENERIC_ERROR = "اسم المستخدم أو كلمة المرور غير صحيحة";

function clientIp() {
  return headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function superAdminLogin(input: SuperAdminLoginInput): Promise<SuperAdminLoginResult> {
  if (!checkLoginRateLimit(`super-admin:${clientIp()}`)) {
    return { success: false, error: "محاولات تسجيل دخول كثيرة جدًا. حاول مرة أخرى بعد دقيقة." };
  }

  const parsed = superAdminLoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }
  const { username, password } = parsed.data;

  const { data: admin } = await getSupabaseAdmin()
    .from("super_admins")
    .select("id, username, password")
    .eq("username", username)
    .maybeSingle();

  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return { success: false, error: GENERIC_ERROR };
  }

  const token = await createSuperAdminSessionToken({ id: admin.id, username: admin.username });
  cookies().set(SUPER_ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return { success: true, redirectTo: "/super-admin/dashboard" };
}

export async function superAdminLogout(): Promise<void> {
  cookies().delete(SUPER_ADMIN_SESSION_COOKIE);
  redirect("/super-admin/login");
}
