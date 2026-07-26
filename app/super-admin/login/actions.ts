"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { SUPER_ADMIN_SESSION_COOKIE } from "@/lib/auth/super-admin-session";
import { startSuperAdminSession } from "@/lib/auth/start-session";
import { getSuperAdminSession } from "@/lib/auth/get-super-admin-session";
import { revokeSession } from "@/lib/auth/session-store";
import { checkLoginRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { comparePassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit";
import { RATE_LIMIT_SCOPE } from "@/lib/constants";
import {
  superAdminLoginSchema,
  type SuperAdminLoginInput,
  type SuperAdminLoginResult,
} from "@/lib/validations/super-admin";

const GENERIC_ERROR = "اسم المستخدم أو كلمة المرور غير صحيحة";

export async function superAdminLogin(input: SuperAdminLoginInput): Promise<SuperAdminLoginResult> {
  if (!(await checkLoginRateLimit(`${RATE_LIMIT_SCOPE.SUPER_ADMIN_LOGIN}:${getClientIp()}`))) {
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
    await recordAuditLog({
      tenantId: null,
      actor: username,
      actorRole: "super_admin",
      action: "login_failed",
      metadata: { reason: "not_found" },
    });
    return { success: false, error: GENERIC_ERROR };
  }

  const valid = await comparePassword(password, admin.password);
  if (!valid) {
    await recordAuditLog({
      tenantId: null,
      actor: username,
      actorRole: "super_admin",
      action: "login_failed",
      metadata: { reason: "wrong_password" },
    });
    return { success: false, error: GENERIC_ERROR };
  }

  await startSuperAdminSession({ id: admin.id, username: admin.username });

  await recordAuditLog({
    tenantId: null,
    actor: username,
    actorRole: "super_admin",
    action: "login_succeeded",
  });

  return { success: true, redirectTo: "/super-admin/dashboard" };
}

export async function superAdminLogout(): Promise<void> {
  const session = await getSuperAdminSession();
  if (session) {
    await revokeSession(session.sessionId);
  }
  cookies().delete(SUPER_ADMIN_SESSION_COOKIE);
  redirect("/super-admin/login");
}
