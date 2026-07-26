"use server";

import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { processExcelRows } from "@/lib/excel/processor";
import { recordAuditLog } from "@/lib/audit";
import { MAX_EXCEL_ROWS } from "@/lib/constants";
import type { ExcelRowInput, ExcelProcessResult } from "@/types";

export async function processExcelBatch(rows: ExcelRowInput[]): Promise<ExcelProcessResult> {
  const session = await getSession();
  if (!session || session.role === "student") {
    return { successCount: 0, errors: ["غير مصرح"] };
  }

  const writeCheck = await assertTenantCanWrite(session.tenantId);
  if (!writeCheck.allowed) {
    return { successCount: 0, errors: [writeCheck.error ?? "غير مصرح"] };
  }

  if (rows.length === 0) {
    return { successCount: 0, errors: ["الملف فارغ"] };
  }

  // Enforced here, not just client-side: this Server Action can be called
  // directly with an arbitrary array, bypassing the browser's file-size
  // check entirely — without this, an unbounded array fans out to one
  // grant_points_v2 RPC call per row (bounded concurrency, but still
  // unbounded total DB load).
  if (rows.length > MAX_EXCEL_ROWS) {
    return { successCount: 0, errors: [`الحد الأقصى ${MAX_EXCEL_ROWS} صف لكل ملف`] };
  }

  const result = await processExcelRows(rows, session.tenantId, session.name);

  await recordAuditLog({
    tenantId: session.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "bulk_points_import",
    metadata: { rowCount: rows.length, successCount: result.successCount, errorCount: result.errors.length },
  });

  return result;
}
