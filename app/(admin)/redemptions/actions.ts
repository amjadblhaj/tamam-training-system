"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { getScope, getBranchFilter } from "@/lib/auth/scope";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { recordAuditLog } from "@/lib/audit";
import { relationValue } from "@/lib/supabase/relation";
import { REDEMPTIONS_PAGE_SIZE } from "@/lib/constants";
import type { RedemptionQueueParams, RedemptionQueueResult, RedemptionQueueRow, ActionResult } from "@/types";

const SELECT_COLUMNS =
  "id, status, redeemed_at, approved_by, approved_at, note, students!inner(id, full_name, student_code, branch_id, branches(name_ar)), rewards(name_ar, points_required)";

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

type RawRedemptionRow = {
  id: number;
  status: string;
  redeemed_at: string;
  approved_by: string | null;
  approved_at: string | null;
  note: string | null;
  students: {
    id: number;
    full_name: string;
    student_code: string | null;
    branch_id: number | null;
    branches: { name_ar: string } | null;
  } | null;
  rewards: { name_ar: string; points_required: number } | null;
};

function mapRow(r: RawRedemptionRow): RedemptionQueueRow {
  return {
    id: r.id,
    student_id: r.students?.id ?? 0,
    student_name: r.students?.full_name ?? "—",
    student_code: r.students?.student_code ?? null,
    branch_id: r.students?.branch_id ?? null,
    branch_name_ar: r.students?.branches?.name_ar ?? "",
    reward_name_ar: r.rewards?.name_ar ?? "—",
    points_required: r.rewards?.points_required ?? 0,
    redeemed_at: r.redeemed_at,
    status: r.status,
    approved_by: r.approved_by,
    approved_at: r.approved_at,
    note: r.note,
  };
}

export async function getRedemptions(params: RedemptionQueueParams): Promise<RedemptionQueueResult> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return { rows: [], total: 0, page: 1, pageSize: REDEMPTIONS_PAGE_SIZE };

  const db = getSupabaseAdmin();
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * REDEMPTIONS_PAGE_SIZE;
  const to = from + REDEMPTIONS_PAGE_SIZE - 1;

  let query = db
    .from("redemptions")
    .select(SELECT_COLUMNS, { count: "exact" })
    .eq("tenant_id", scope.tenantId)
    .order("redeemed_at", { ascending: false })
    .range(from, to);

  if (params.status) query = query.eq("status", params.status);

  const branchFilter = getBranchFilter(scope, params.branchId);
  if (branchFilter) query = query.eq("students.branch_id", branchFilter);

  const safeSearch = params.search ? sanitizeSearchTerm(params.search) : "";
  if (safeSearch)
    query = query.or(`full_name.ilike.%${safeSearch}%,student_code.ilike.%${safeSearch}%`, {
      foreignTable: "students",
    });

  const { data, count } = await query;

  return {
    rows: ((data ?? []) as unknown as RawRedemptionRow[]).map(mapRow),
    total: count ?? 0,
    page,
    pageSize: REDEMPTIONS_PAGE_SIZE,
  };
}

export async function getPendingRedemptionsCount(): Promise<number> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return 0;

  const db = getSupabaseAdmin();
  let query = db
    .from("redemptions")
    .select("id, students!inner(branch_id)", { count: "exact", head: true })
    .eq("tenant_id", scope.tenantId)
    .eq("status", "pending");

  if (scope.role === "staff") query = query.eq("students.branch_id", scope.branchId);

  const { count } = await query;
  return count ?? 0;
}

const RPC_ERROR_MESSAGES: Record<string, string> = {
  "Not found": "الطلب غير موجود",
  "Already processed": "تمت معالجة هذا الطلب مسبقاً",
};

async function assertRedemptionBranchAccess(
  tenantId: string,
  redemptionId: number,
  scope: { role: "admin" | "staff"; branchId: number | null }
): Promise<ActionResult> {
  const db = getSupabaseAdmin();
  const { data: redemption } = await db
    .from("redemptions")
    .select("id, students!inner(branch_id)")
    .eq("id", redemptionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!redemption) return { success: false, error: "الطلب غير موجود" };

  const studentBranchId = relationValue<number>(redemption.students, "branch_id");
  if (scope.role === "staff" && studentBranchId !== scope.branchId) {
    return { success: false, error: "لا تملك صلاحية على طلبات فرع آخر" };
  }
  return { success: true };
}

/** Confirms the student physically received the reward. */
export async function approveRedemption(redemptionId: number): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const accessCheck = await assertRedemptionBranchAccess(scope.tenantId, redemptionId, scope);
  if (!accessCheck.success) return accessCheck;

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("approve_redemption", {
    p_tenant_id: scope.tenantId,
    p_redemption_id: redemptionId,
    p_approved_by: session.name,
  });

  if (error || !data?.success) {
    return { success: false, error: RPC_ERROR_MESSAGES[data?.error] ?? "حدث خطأ أثناء تأكيد الاستلام" };
  }

  await recordAuditLog({
    tenantId: scope.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "redemption_approved",
    entity: "redemption",
    entityId: String(redemptionId),
  });

  return { success: true };
}

/** Rejects a pending redemption and refunds the points (see reject_redemption RPC). */
export async function rejectRedemption(redemptionId: number, reason?: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const accessCheck = await assertRedemptionBranchAccess(scope.tenantId, redemptionId, scope);
  if (!accessCheck.success) return accessCheck;

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("reject_redemption", {
    p_tenant_id: scope.tenantId,
    p_redemption_id: redemptionId,
    p_rejected_by: session.name,
    p_reason: reason?.trim() || null,
  });

  if (error || !data?.success) {
    return { success: false, error: RPC_ERROR_MESSAGES[data?.error] ?? "حدث خطأ أثناء رفض الطلب" };
  }

  await recordAuditLog({
    tenantId: scope.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "redemption_rejected",
    entity: "redemption",
    entityId: String(redemptionId),
    metadata: { refunded: data.refunded, reason: reason?.trim() || null },
  });

  return { success: true };
}
