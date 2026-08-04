"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { getScope, getBranchFilter } from "@/lib/auth/scope";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { comparePassword } from "@/lib/auth/password";
import { canActOnTransaction } from "@/lib/auth/transactionPermissions";
import { recordAuditLog } from "@/lib/audit";
import { ACTIVITY_PAGE_SIZE, MAX_BULK_UNDO } from "@/lib/constants";
import type { ActivityLogParams, ActivityLogResult, ActivityLogRow, ActionResult, BulkUndoResponse } from "@/types";

const SELECT_COLUMNS =
  "id, points, action, type, granted_by, created_at, reversed, branch_id, students!inner(full_name, student_code), branches(name_ar)";

function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()%]/g, "").trim();
}

type RawActivityRow = {
  id: number;
  points: number;
  action: string;
  type: string;
  granted_by: string;
  created_at: string;
  reversed: boolean;
  branch_id: number | null;
  students: { full_name: string; student_code: string | null } | null;
  branches: { name_ar: string } | null;
};

function mapRow(r: RawActivityRow): ActivityLogRow {
  return {
    id: r.id,
    student_name: r.students?.full_name ?? "—",
    student_code: r.students?.student_code ?? null,
    branch_id: r.branch_id,
    branch_name_ar: r.branches?.name_ar ?? "",
    action: r.action,
    points: r.points,
    type: r.type,
    granted_by: r.granted_by,
    created_at: r.created_at,
    reversed: r.reversed,
  };
}

export async function getActivityLog(params: ActivityLogParams): Promise<ActivityLogResult> {
  const session = await getSession();
  const scope = session && getScope(session);
  if (!scope) return { rows: [], total: 0, page: 1, pageSize: ACTIVITY_PAGE_SIZE };

  const db = getSupabaseAdmin();
  const page = params.page && params.page > 0 ? params.page : 1;
  const from = (page - 1) * ACTIVITY_PAGE_SIZE;
  const to = from + ACTIVITY_PAGE_SIZE - 1;

  let query = db
    .from("points_log")
    .select(SELECT_COLUMNS, { count: "exact" })
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false })
    .range(from, to);

  const branchFilter = getBranchFilter(scope, params.branchId);
  if (branchFilter) query = query.eq("branch_id", branchFilter);
  if (params.type) query = query.eq("type", params.type);
  if (params.staffUsername)
    query = query.ilike("granted_by", `%${params.staffUsername.replace(/[,()%]/g, "")}%`);
  const safeSearch = params.search ? sanitizeSearchTerm(params.search) : "";
  if (safeSearch)
    query = query.or(`full_name.ilike.%${safeSearch}%,student_code.ilike.%${safeSearch}%`, {
      foreignTable: "students",
    });
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
  const scope = getScope(session);
  if (!scope) return [];

  const db = getSupabaseAdmin();
  let query = db
    .from("points_log")
    .select(SELECT_COLUMNS)
    .eq("tenant_id", scope.tenantId)
    .order("created_at", { ascending: false })
    .limit(5000);

  const branchFilter = getBranchFilter(scope, params.branchId);
  if (branchFilter) query = query.eq("branch_id", branchFilter);
  if (params.type) query = query.eq("type", params.type);
  if (params.staffUsername)
    query = query.ilike("granted_by", `%${params.staffUsername.replace(/[,()%]/g, "")}%`);
  const safeSearch = params.search ? sanitizeSearchTerm(params.search) : "";
  if (safeSearch)
    query = query.or(`full_name.ilike.%${safeSearch}%,student_code.ilike.%${safeSearch}%`, {
      foreignTable: "students",
    });
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);

  const { data } = await query;
  return ((data ?? []) as unknown as RawActivityRow[]).map(mapRow);
}

const UNDO_ERROR_MESSAGES: Record<string, string> = {
  "Transaction not found": "الحركة غير موجودة",
  "Transaction already reversed": "تم التراجع عن هذه الحركة مسبقاً",
  "Cannot undo a reversal": "لا يمكن التراجع عن حركة عكسية",
  "Student not found": "الطالب غير موجود",
};

async function verifyOwnPassword(
  db: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  staffId: string,
  password: string
): Promise<boolean> {
  const { data: staffRow } = await db
    .from("staff")
    .select("password")
    .eq("id", staffId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!staffRow && (await comparePassword(password, staffRow.password));
}

/**
 * Reverses a grant/redeem/excel/manual/adjustment transaction. This is the
 * only way to correct a mistake — there is no delete anywhere in the ledger.
 * Requires the CURRENT user's own password, checked here server-side only
 * (never sent to, or verified in, the browser).
 */
export async function undoTransaction(transactionId: number, password: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  const db = getSupabaseAdmin();

  if (!(await verifyOwnPassword(db, scope.tenantId, session.id, password))) {
    return { success: false, error: "كلمة المرور غير صحيحة" };
  }

  const { data: txn } = await db
    .from("points_log")
    .select("id, branch_id")
    .eq("id", transactionId)
    .eq("tenant_id", scope.tenantId)
    .maybeSingle();
  if (!txn) return { success: false, error: "الحركة غير موجودة" };

  if (!canActOnTransaction(scope, txn)) {
    return { success: false, error: "لا تملك صلاحية التراجع عن حركات فرع آخر" };
  }

  const { data, error } = await db.rpc("undo_transaction", {
    p_tenant_id: scope.tenantId,
    p_transaction_id: transactionId,
    p_performed_by: session.name,
  });

  if (error || !data?.success) {
    return { success: false, error: UNDO_ERROR_MESSAGES[data?.error] ?? data?.error ?? "حدث خطأ أثناء التراجع" };
  }

  await recordAuditLog({
    tenantId: scope.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "transaction_undo",
    entity: "points_log",
    entityId: String(transactionId),
  });

  return { success: true };
}

/**
 * Undoes several transactions with a single password check, then loops the
 * same atomic `undo_transaction` RPC per id (no new bulk SQL function —
 * each row is already row-locked and independent). A transaction that can't
 * be undone (already reversed, a reversal itself, would go negative) is
 * skipped with a reason rather than failing the whole batch.
 */
export async function bulkUndoTransactions(transactionIds: number[], password: string): Promise<BulkUndoResponse> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return { success: false, error: "لم يتم تحديد أي حركة" };
  }
  if (transactionIds.length > MAX_BULK_UNDO) {
    return { success: false, error: `الحد الأقصى ${MAX_BULK_UNDO} حركة في المرة الواحدة` };
  }

  const db = getSupabaseAdmin();

  if (!(await verifyOwnPassword(db, scope.tenantId, session.id, password))) {
    return { success: false, error: "كلمة المرور غير صحيحة" };
  }

  const succeeded: number[] = [];
  const skipped: { id: number; reason: string }[] = [];

  for (const id of transactionIds) {
    const { data: txn } = await db
      .from("points_log")
      .select("id, branch_id")
      .eq("id", id)
      .eq("tenant_id", scope.tenantId)
      .maybeSingle();
    if (!txn) {
      skipped.push({ id, reason: "الحركة غير موجودة" });
      continue;
    }
    if (!canActOnTransaction(scope, txn)) {
      skipped.push({ id, reason: "لا تملك صلاحية على فرع آخر" });
      continue;
    }

    const { data, error } = await db.rpc("undo_transaction", {
      p_tenant_id: scope.tenantId,
      p_transaction_id: id,
      p_performed_by: session.name,
    });

    if (error || !data?.success) {
      skipped.push({ id, reason: UNDO_ERROR_MESSAGES[data?.error] ?? data?.error ?? "تعذر التراجع" });
      continue;
    }

    succeeded.push(id);
    await recordAuditLog({
      tenantId: scope.tenantId,
      actor: session.name,
      actorRole: session.role,
      action: "transaction_undo",
      entity: "points_log",
      entityId: String(id),
      metadata: { bulk: true },
    });
  }

  return { success: true, succeeded, skipped };
}
