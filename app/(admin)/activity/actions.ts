"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { ACTIVITY_PAGE_SIZE } from "@/lib/constants";
import type { ActivityLogParams, ActivityLogResult, ActivityLogRow } from "@/types";
const SELECT_COLUMNS =
  "id, points, action, type, granted_by, created_at, students(full_name), branches(name_ar)";

type RawActivityRow = {
  id: number;
  points: number;
  action: string;
  type: string;
  granted_by: string;
  created_at: string;
  students: { full_name: string } | null;
  branches: { name_ar: string } | null;
};

function mapRow(r: RawActivityRow): ActivityLogRow {
  return {
    id: r.id,
    student_name: r.students?.full_name ?? "—",
    branch_name_ar: r.branches?.name_ar ?? "",
    action: r.action,
    points: r.points,
    type: r.type,
    granted_by: r.granted_by,
    created_at: r.created_at,
  };
}

export async function getActivityLog(params: ActivityLogParams): Promise<ActivityLogResult> {
  const session = await getSession();
  if (!session) return { rows: [], total: 0, page: 1, pageSize: ACTIVITY_PAGE_SIZE };

  const db = getSupabaseAdmin();
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * ACTIVITY_PAGE_SIZE;
  const to = from + ACTIVITY_PAGE_SIZE - 1;

  let query = db
    .from("points_log")
    .select(SELECT_COLUMNS, { count: "exact" })
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.type) query = query.eq("type", params.type);
  if (params.staffUsername)
    query = query.ilike("granted_by", `%${params.staffUsername.replace(/[,()%]/g, "")}%`);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);

  const { data, count } = await query;

  return {
    rows: ((data ?? []) as unknown as RawActivityRow[]).map(mapRow),
    total: count ?? 0,
    page,
    pageSize: ACTIVITY_PAGE_SIZE,
  };
}

export async function getActivityLogForExport(
  params: Omit<ActivityLogParams, "page">
): Promise<ActivityLogRow[]> {
  const session = await getSession();
  if (!session || session.role !== "admin") return [];

  const db = getSupabaseAdmin();
  let query = db
    .from("points_log")
    .select(SELECT_COLUMNS)
    .eq("tenant_id", session.tenantId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (params.branchId) query = query.eq("branch_id", params.branchId);
  if (params.type) query = query.eq("type", params.type);
  if (params.staffUsername)
    query = query.ilike("granted_by", `%${params.staffUsername.replace(/[,()%]/g, "")}%`);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);

  const { data } = await query;
  return ((data ?? []) as unknown as RawActivityRow[]).map(mapRow);
}
