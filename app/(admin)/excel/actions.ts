"use server";

import { getSession } from "@/lib/auth/get-session";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { processExcelRows } from "@/lib/excel/processor";
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

  return processExcelRows(rows, session.tenantId, session.name);
}
