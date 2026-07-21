import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ExcelRowInput, ExcelProcessResult } from "@/types";

const CONCURRENCY = 10;

export async function processExcelRows(rows: ExcelRowInput[], grantedBy: string): Promise<ExcelProcessResult> {
  const db = getSupabaseAdmin();
  const result: ExcelProcessResult = { successCount: 0, errors: [] };

  const validRows: ExcelRowInput[] = [];
  for (const row of rows) {
    if (!row.phone) {
      result.errors.push(`الصف ${row.rowNumber}: رقم الهاتف مفقود`);
      continue;
    }
    if (!Number.isInteger(row.points) || row.points < 1 || row.points > 9999) {
      result.errors.push(`الصف ${row.rowNumber}: قيمة النقاط غير صحيحة`);
      continue;
    }
    validRows.push(row);
  }

  if (validRows.length === 0) return result;

  // One batched lookup instead of one query per row.
  const uniquePhones = Array.from(new Set(validRows.map((r) => r.phone)));
  const { data: students } = await db
    .from("students")
    .select("id, phone")
    .in("phone", uniquePhones)
    .eq("active", true);

  const phoneToId = new Map((students ?? []).map((s) => [s.phone, s.id]));

  // grant_points calls are network round-trips to Supabase; running them
  // sequentially made 60 rows take ~20s. Each call is still individually
  // atomic (row-locked), so bounded concurrency is safe and ~10x faster.
  for (let i = 0; i < validRows.length; i += CONCURRENCY) {
    const chunk = validRows.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (row) => {
        const studentId = phoneToId.get(row.phone);
        if (!studentId) {
          return { rowNumber: row.rowNumber, error: `رقم الهاتف ${row.phone} غير مسجل` };
        }

        const { data, error } = await db.rpc("grant_points", {
          p_student_id: studentId,
          p_points: row.points,
          p_action: row.reason || "استيراد إكسل",
          p_type: "excel",
          p_granted_by: grantedBy,
          p_note: null,
        });

        if (error || !data?.success) {
          return { rowNumber: row.rowNumber, error: "تعذر تحديث النقاط" };
        }
        return { rowNumber: row.rowNumber, error: null };
      })
    );

    for (const r of chunkResults) {
      if (r.error) {
        result.errors.push(`الصف ${r.rowNumber}: ${r.error}`);
      } else {
        result.successCount++;
      }
    }
  }

  return result;
}
