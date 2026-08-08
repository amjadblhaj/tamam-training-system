"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
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
  // student_visible = false covers both halves of an undo (the original
  // grant and its reversal entry), so an undone grant reads to the student
  // as if it never happened. The staff/admin activity log is deliberately
  // unfiltered and still shows the full trail.
  const { data } = await db
    .from("points_log")
    .select("id, action, points, created_at")
    .eq("student_id", Number(session.id))
    .eq("tenant_id", session.tenantId)
    .eq("student_visible", true)
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

/**
 * A student only ever sees their own branch's board — there is deliberately
 * no all-branches view in the portal (staff/admin keep theirs).
 */
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

/** The student's own branch name, for the leaderboard heading. */
export async function getPortalBranchName(): Promise<string | null> {
  const session = await requireStudentSession();
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("branches")
    .select("name_ar")
    .eq("id", session.branchId)
    .eq("tenant_id", session.tenantId)
    .maybeSingle();
  return data?.name_ar ?? null;
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
