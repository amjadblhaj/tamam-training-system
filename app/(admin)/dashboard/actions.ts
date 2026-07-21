"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { DashboardMetrics, TopStudent, ActivityEntry } from "@/types";

export async function getDashboardMetrics(branchId: number | null): Promise<DashboardMetrics> {
  const db = getSupabaseAdmin();

  let studentsQuery = db.from("students").select("id", { count: "exact", head: true }).eq("active", true);
  if (branchId) studentsQuery = studentsQuery.eq("branch_id", branchId);
  const { count: totalStudents } = await studentsQuery;

  let pointsQuery = db.from("points_log").select("points").gt("points", 0);
  if (branchId) pointsQuery = pointsQuery.eq("branch_id", branchId);
  const { data: pointsRows } = await pointsQuery;
  const totalPointsGranted = (pointsRows ?? []).reduce((sum, r) => sum + r.points, 0);

  let redemptionsQuery = db.from("redemptions").select("id, students!inner(branch_id)");
  if (branchId) redemptionsQuery = redemptionsQuery.eq("students.branch_id", branchId);
  const { data: redemptionRows } = await redemptionsQuery;
  const rewardsRedeemed = (redemptionRows ?? []).length;

  let branchesQuery = db.from("branches").select("id", { count: "exact", head: true }).eq("active", true);
  if (branchId) branchesQuery = branchesQuery.eq("id", branchId);
  const { count: activeBranches } = await branchesQuery;

  return {
    totalStudents: totalStudents ?? 0,
    totalPointsGranted,
    rewardsRedeemed,
    activeBranches: activeBranches ?? 0,
  };
}

export async function getTopStudents(branchId: number | null): Promise<TopStudent[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from("students")
    .select("id, full_name, points, branches(name_ar)")
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(5);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data } = await query;

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: s.points,
    branch_name_ar: (s.branches as unknown as { name_ar: string } | null)?.name_ar ?? "",
  }));
}

export async function getRecentActivity(branchId: number | null): Promise<ActivityEntry[]> {
  const db = getSupabaseAdmin();
  let query = db
    .from("points_log")
    .select("id, points, action, granted_by, created_at, students(full_name), branches(name_ar)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data } = await query;

  return (data ?? []).map((r) => ({
    id: r.id,
    student_name: (r.students as unknown as { full_name: string } | null)?.full_name ?? "—",
    branch_name_ar: (r.branches as unknown as { name_ar: string } | null)?.name_ar ?? "",
    action: r.action,
    points: r.points,
    granted_by: r.granted_by,
    created_at: r.created_at,
  }));
}
