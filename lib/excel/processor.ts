import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { ExcelRowInput, ExcelProcessResult } from "@/types";

export async function processExcelRows(rows: ExcelRowInput[], grantedBy: string): Promise<ExcelProcessResult> {
  const db = getSupabaseAdmin();
  const result: ExcelProcessResult = { successCount: 0, errors: [] };

  for (const row of rows) {
    const { phone, points, reason, rowNumber } = row;

    if (!phone) {
      result.errors.push(`الصف ${rowNumber}: رقم الهاتف مفقود`);
      continue;
    }
    if (!Number.isInteger(points) || points < 1 || points > 9999) {
      result.errors.push(`الصف ${rowNumber}: قيمة النقاط غير صحيحة`);
      continue;
    }

    const { data: student } = await db
      .from("students")
      .select("id")
      .eq("phone", phone)
      .eq("active", true)
      .maybeSingle();

    if (!student) {
      result.errors.push(`الصف ${rowNumber}: رقم الهاتف ${phone} غير مسجل`);
      continue;
    }

    const { data, error } = await db.rpc("grant_points", {
      p_student_id: student.id,
      p_points: points,
      p_action: reason || "استيراد إكسل",
      p_type: "excel",
      p_granted_by: grantedBy,
      p_note: null,
    });

    if (error || !data?.success) {
      result.errors.push(`الصف ${rowNumber}: تعذر تحديث النقاط`);
      continue;
    }

    result.successCount++;
  }

  return result;
}
