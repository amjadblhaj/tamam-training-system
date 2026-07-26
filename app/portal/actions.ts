"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { relationValue } from "@/lib/supabase/relation";
import type { PortalReward, PortalTransaction, RedeemResult, LeaderboardEntry } from "@/types";
import type { SessionPayload } from "@/lib/auth/session";

// Every function here derives the student id/tenant from the session itself
// rather than accepting them as arguments — these are callable directly from
// the client, so client-supplied values would let a student read another
// student's (or another academy's) balance/history simply by passing a
// different id.
async function requireStudentSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getPortalRewards(): Promise<PortalReward[]> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("rewards")
    .select("id, name_ar, description, points_required")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .order("points_required", { ascending: true });
  return data ?? [];
}

export async function getPortalBalance(): Promise<number> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("points")
    .eq("id", Number(session.id))
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  return data?.points ?? 0;
}

export async function getPortalTransactions(): Promise<PortalTransaction[]> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("points_log")
    .select("id, action, points, created_at")
    .eq("student_id", Number(session.id))
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getBranchLeaderboard(): Promise<LeaderboardEntry[]> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("id, full_name, points")
    .eq("tenant_id", session.tenantId)
    .eq("branch_id", session.branchId)
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(10);
  return data ?? [];
}

export async function getOverallLeaderboard(): Promise<LeaderboardEntry[]> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("id, full_name, points, branches(name_ar)")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(10);

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: s.points,
    branch_name_ar: relationValue<string>(s.branches, "name_ar"),
  }));
}

export async function redeemReward(rewardId: number): Promise<RedeemResult> {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return { success: false, error: "غير مصرح" };
  }

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) {
    return { success: false, error: "الاستبدال متوقف مؤقتاً" };
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("redeem_reward_v2", {
    p_tenant_id: session.tenantId,
    p_student_id: Number(session.id),
    p_reward_id: rewardId,
    p_granted_by: session.name,
  });

  if (error || !data?.success) {
    const message =
      data?.error === "Insufficient points"
        ? "رصيدك غير كافٍ لاستبدال هذه المكافأة"
        : data?.error === "Reward inactive"
          ? "هذه المكافأة لم تعد متاحة"
          : "حدث خطأ أثناء الاستبدال";
    return { success: false, error: message };
  }

  return { success: true, newBalance: data.new_balance };
}
