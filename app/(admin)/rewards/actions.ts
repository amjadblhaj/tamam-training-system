"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { rewardSchema, type RewardInput } from "@/lib/validations/reward";
import { recordAuditLog } from "@/lib/audit";
import type { Reward, ActionResult } from "@/types";

async function requireAdminWriteAccess() {
  const session = await getSession();
  if (session?.role !== "admin") return { session: null, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) return { session: null, error: writeCheck.error };

  return { session, error: undefined };
}

export async function getRewards(): Promise<Reward[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("rewards")
    .select("*")
    .eq("tenant_id", session.tenantId)
    .order("points_required", { ascending: true });
  return data ?? [];
}

export async function createReward(input: RewardInput): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

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
    tenant_id: session.tenantId,
  });

  if (error) return { success: false, error: "حدث خطأ أثناء إضافة المكافأة" };
  return { success: true };
}

export async function updateReward(id: number, input: RewardInput): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

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
    .eq("id", id)
    .eq("tenant_id", session.tenantId);

  if (error) return { success: false, error: "حدث خطأ أثناء تحديث المكافأة" };
  return { success: true };
}

export async function toggleRewardActive(id: number, active: boolean): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("rewards")
    .update({ active })
    .eq("id", id)
    .eq("tenant_id", session.tenantId);
  if (error) return { success: false, error: "حدث خطأ ما" };
  return { success: true };
}

export async function deleteReward(id: number): Promise<ActionResult> {
  const { session, error: accessError } = await requireAdminWriteAccess();
  if (!session) return { success: false, error: accessError };

  const db = getSupabaseAdmin();
  const { error } = await db.from("rewards").delete().eq("id", id).eq("tenant_id", session.tenantId);
  if (error) return { success: false, error: "حدث خطأ أثناء حذف المكافأة" };

  await recordAuditLog({
    tenantId: session.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "reward_deleted",
    entity: "reward",
    entityId: String(id),
  });

  return { success: true };
}
