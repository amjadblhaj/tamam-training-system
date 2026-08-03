import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone, isValidPhone } from "@/lib/excel/phoneUtils";
import type { ExcelNameRow, ExcelBatchProcessResult } from "@/types";

/** Bounds DB load from a single batch. */
const MAX_ADVANCED_EXCEL_ROWS = 2000;

/**
 * Counts occurrences per normalized phone (first name seen wins; a missing
 * name falls back to the phone itself so nothing renders blank), then checks
 * each unique phone against this tenant's students: already in this branch
 * (grantable), registered under a different branch (skipped — a phone
 * belongs to exactly one branch, enforced by the DB unique constraint), or
 * brand new. `pointsToGrant` is `pointsPerOccurrence × occurrences` for both
 * existing and new phones — a phone that appears 3 times in the file gets
 * 3× the points regardless of which bucket it lands in.
 *
 * Takes already-parsed rows (see parseExcelRows.ts) rather than a raw
 * file/buffer — parsing happens client-side in the wizard's upload step;
 * this function is the DB-dependent half and must stay server-only.
 */
export async function processExcelAdvanced(
  rows: ExcelNameRow[],
  branchId: number,
  pointsPerOccurrence: number,
  reason: string,
  tenantId: string
): Promise<ExcelBatchProcessResult> {
  const result: ExcelBatchProcessResult = {
    branchId,
    reason,
    pointsPerOccurrence,
    existingMatches: [],
    otherBranchSkipped: [],
    newPhones: [],
    errors: [],
  };

  const capped = rows.slice(0, MAX_ADVANCED_EXCEL_ROWS);
  if (rows.length > MAX_ADVANCED_EXCEL_ROWS) {
    result.errors.push(`الحد الأقصى ${MAX_ADVANCED_EXCEL_ROWS} صف — تم تجاهل الباقي`);
  }

  const phoneMap = new Map<string, { name: string; count: number }>();
  for (const row of capped) {
    const phone = normalizePhone(row.phone);
    if (!phone || !isValidPhone(phone)) {
      if (row.phone) result.errors.push(`رقم هاتف غير صالح تم تجاهله: ${row.phone}`);
      continue;
    }
    const existing = phoneMap.get(phone);
    if (existing) {
      existing.count++;
    } else {
      phoneMap.set(phone, { name: row.name.trim() || phone, count: 1 });
    }
  }

  if (phoneMap.size === 0) return result;

  const db = getSupabaseAdmin();
  const uniquePhones = Array.from(phoneMap.keys());
  const { data: students } = await db
    .from("students")
    .select("id, phone, branch_id, full_name, student_code")
    .eq("tenant_id", tenantId)
    .in("phone", uniquePhones)
    .eq("active", true);

  const byPhone = new Map((students ?? []).map((s) => [s.phone, s]));

  for (const [phone, info] of Array.from(phoneMap)) {
    const pointsToGrant = pointsPerOccurrence * info.count;
    const student = byPhone.get(phone);

    if (!student) {
      result.newPhones.push({
        phone,
        name: info.name,
        occurrences: info.count,
        status: "new",
        pointsToGrant,
      });
    } else if (student.branch_id === branchId) {
      result.existingMatches.push({
        phone,
        name: student.full_name,
        occurrences: info.count,
        status: "existing_this_branch",
        studentId: student.id,
        studentCode: student.student_code,
        pointsToGrant,
      });
    } else {
      result.otherBranchSkipped.push({
        phone,
        name: student.full_name,
        occurrences: info.count,
        status: "other_branch",
        pointsToGrant: 0,
      });
    }
  }

  return result;
}
