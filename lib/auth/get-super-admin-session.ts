import "server-only";
import { cookies } from "next/headers";
import {
  SUPER_ADMIN_SESSION_COOKIE,
  verifySuperAdminSessionToken,
  type SuperAdminSessionPayload,
} from "@/lib/auth/super-admin-session";

export async function getSuperAdminSession(): Promise<SuperAdminSessionPayload | null> {
  const token = cookies().get(SUPER_ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySuperAdminSessionToken(token);
}
