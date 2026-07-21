"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { rewardSchema, type RewardInput } from "@/lib/validations/reward";
import type { Reward, ActionResult } from "@/types";

async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export async function getRewards(): Promise<Reward[]> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("rewards").select("*").order("points_required", { ascending: true });
  return data ?? [];
}

export async function createReward(input: RewardInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { nameAr, nameEn, description, pointsRequired } = parsed.data;

  const db = getSupabaseAdmin();
  const { error } = await db.from("rewards").insert({
    name_ar: nameAr,
    name_en: nameEn,
    description: description || null,
    points_required: pointsRequired,
  });

  if (error) return { success: false, error: "حدث خطأ أثناء إضافة المكافأة" };
  return { success: true };
}

export async function updateReward(id: number, input: RewardInput): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const parsed = rewardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { nameAr, nameEn, description, pointsRequired } = parsed.data;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("rewards")
    .update({
      name_ar: nameAr,
      name_en: nameEn,
      description: description || null,
      points_required: pointsRequired,
    })
    .eq("id", id);

  if (error) return { success: false, error: "حدث خطأ أثناء تحديث المكافأة" };
  return { success: true };
}

export async function toggleRewardActive(id: number, active: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const db = getSupabaseAdmin();
  const { error } = await db.from("rewards").update({ active }).eq("id", id);
  if (error) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function deleteReward(id: number): Promise<ActionResult> {
  if (!(await isAdmin())) return { success: false, error: "غير مصرح" };

  const db = getSupabaseAdmin();
  const { error } = await db.from("rewards").delete().eq("id", id);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف المكافأة" };
  return { success: true };
}
