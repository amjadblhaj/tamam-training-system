"use server";

import bcrypt from "bcryptjs";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { createStaffSchema, type CreateStaffInput } from "@/lib/validations/staff";
import type { StaffRow, ActionResult } from "@/types";

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export async function getStaffList(): Promise<StaffRow[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("staff")
    .select("id, username, role, branch_id, active, branches(name_ar)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => ({
    id: s.id,
    username: s.username,
    role: s.role,
    branch_id: s.branch_id,
    branch_name_ar: (s.branches as unknown as { name_ar: string } | null)?.name_ar ?? null,
    active: s.active,
  }));
}

export async function createStaff(input: CreateStaffInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { username, password, branchId, role } = parsed.data;
  const branchIdNum = branchId ? Number(branchId) : null;

  const db = getSupabaseAdmin();
  const { data: existing } = await db.from("staff").select("id").eq("username", username).maybeSingle();
  if (existing) {
    return { success: false, error: "اسم المستخدم مستخدم بالفعل" };
  }

  const hashed = await bcrypt.hash(password, 12);
  const { error } = await db.from("staff").insert({
    username,
    password: hashed,
    branch_id: branchIdNum,
    role,
  });

  if (error) return { success: false, error: "حدث خطأ أثناء إضافة الموظف" };
  return { success: true };
}

export async function toggleStaffActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const session = await getSession();
  if (session?.id === id) {
    return { success: false, error: "لا يمكنك إلغاء تفعيل حسابك الخاص" };
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("staff").update({ active }).eq("id", id);
  if (error) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function deleteStaff(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const session = await getSession();
  if (session?.id === id) {
    return { success: false, error: "لا يمكنك حذف حسابك الخاص" };
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("staff").delete().eq("id", id);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف الموظف" };
  return { success: true };
}
