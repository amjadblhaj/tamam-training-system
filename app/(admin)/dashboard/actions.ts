"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { getScope, getBranchFilter } from "@/lib/auth/scope";
import { relationValue } from "@/lib/supabase/relation";
import type { DashboardMetrics, TopStudent, ActivityEntry } from "@/types";

export async function getDashboardMetrics(branchId: number | null): Promise<DashboardMetrics> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return { totalStudents: 0, totalPointsGranted: 0, rewardsRedeemed: 0, activeBranches: 0 };
  const tenantId = scope.tenantId;
  const effectiveBranchId = getBranchFilter(scope, branchId);
  const db = getSupabaseAdmin();

  let studentsQuery = db
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (effectiveBranchId) studentsQuery = studentsQuery.eq("branch_id", effectiveBranchId);
  const { count: totalStudents } = await studentsQuery;

  let pointsQuery = db.from("points_log").select("points").eq("tenant_id", tenantId).gt("points", 0);
  if (effectiveBranchId) pointsQuery = pointsQuery.eq("branch_id", effectiveBranchId);
  const { data: pointsRows } = await pointsQuery;
  const totalPointsGranted = (pointsRows ?? []).reduce((sum, r) => sum + r.points, 0);

  let redemptionsQuery = db
    .from("redemptions")
    .select("id, students!inner(branch_id)")
    .eq("tenant_id", tenantId);
  if (effectiveBranchId) redemptionsQuery = redemptionsQuery.eq("students.branch_id", effectiveBranchId);
  const { data: redemptionRows } = await redemptionsQuery;
  const rewardsRedeemed = (redemptionRows ?? []).length;

  let branchesQuery = db
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (effectiveBranchId) branchesQuery = branchesQuery.eq("id", effectiveBranchId);
  const { count: activeBranches } = await branchesQuery;

  return {
    totalStudents: totalStudents ?? 0,
    totalPointsGranted,
    rewardsRedeemed,
    activeBranches: activeBranches ?? 0,
  };
}

export async function getTopStudents(branchId: number | null): Promise<TopStudent[]> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return [];
  const effectiveBranchId = getBranchFilter(scope, branchId);

  const db = getSupabaseAdmin();
  let query = db
    .from("students")
    .select("id, full_name, points, branches(name_ar)")
    .eq("tenant_id", scope.tenantId)
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(5);
  if (effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
  const { data } = await query;

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: s.points,
    branch_name_ar: relationValue<string>(s.branches, "name_ar") ?? "",
  }));
}

export async function getRecentActivity(branchId: number | null): Promise<ActivityEntry[]> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return [];
  const effectiveBranchId = getBranchFilter(scope, branchId);

  const db = getSupabaseAdmin();
  let query = db
    .from("points_log")
    .select("id, points, action, granted_by, created_at, students(full_name), branches(name_ar)")
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (effectiveBranchId) query = query.eq("branch_id", effectiveBranchId);
  const { data } = await query;

  return (data ?? []).map((r) => ({
    id: r.id,
    student_name: relationValue<string>(r.students, "full_name") ?? "—",
    branch_name_ar: relationValue<string>(r.branches, "name_ar") ?? "",
    action: r.action,
    points: r.points,
    granted_by: r.granted_by,
    created_at: r.created_at,
  }));
}
