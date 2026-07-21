"use server";

import { getSession } from "@/lib/auth/get-session";
import { processExcelRows } from "@/lib/excel/processor";
import type { ExcelRowInput, ExcelProcessResult } from "@/types";

export async function processExcelBatch(rows: ExcelRowInput[]): Promise<ExcelProcessResult> {
  const session = await getSession();
  if (!session || session.role === "student") {
    return { successCount: 0, errors: ["غير مصرح"] };
  }
  if (rows.length === 0) {
    return { successCount: 0, errors: ["الملف فارغ"] };
  }

  return processExcelRows(rows, session.name);
}
