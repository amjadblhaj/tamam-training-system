"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import type { PortalReward, PortalTransaction, RedeemResult } from "@/types";

// Every function here derives the student id from the session itself rather
// than accepting it as an argument — these are callable directly from the
// client, so a client-supplied id would let a student read another
// student's balance/history simply by passing a different number.
async function requireStudentId(): Promise<number> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    throw new Error("Unauthorized");
  }
  return Number(session.id);
}

export async function getPortalRewards(): Promise<PortalReward[]> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("rewards")
    .select("id, name_ar, description, points_required")
    .eq("active", true)
    .order("points_required", { ascending: true });
  return data ?? [];
}

export async function getPortalBalance(): Promise<number> {
  const studentId = await requireStudentId();
  const db = getSupabaseAdmin();
  const { data } = await db.from("students").select("points").eq("id", studentId).maybeSingle();
  return data?.points ?? 0;
}

export async function getPortalTransactions(): Promise<PortalTransaction[]> {
  const studentId = await requireStudentId();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("points_log")
    .select("id, action, points, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function redeemReward(rewardId: number): Promise<RedeemResult> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { success: false, error: "غير مصرح" };
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("redeem_reward", {
    p_student_id: Number(session.id),
    p_reward_id: rewardId,
    p_granted_by: session.name,
  });

  if (error || !data?.success) {
    const message =
      data?.error === "Insufficient points"
        ? "رصيدك غير كافٍ لاستبدال هذه المكافأة"
        : data?.error === "Reward is no longer active"
          ? "هذه المكافأة لم تعد متاحة"
          : "حدث خطأ أثناء الاستبدال";
    return { success: false, error: message };
  }

  return { success: true, newBalance: data.new_balance };
}
