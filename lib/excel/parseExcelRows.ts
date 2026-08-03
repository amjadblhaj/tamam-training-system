import type { ExcelNameRow } from "@/types";

// Deliberately has no "server-only" import (unlike the rest of lib/excel/) —
// this runs in the browser, inside the wizard's upload step, on a sheet
// already read there via the `xlsx` package. Keep it free of any
// getSupabaseAdmin-touching import or it becomes unsafe to bundle client-side.

const NAME_KEYWORDS = ["name", "الاسم", "اسم", "الطالب", "student"];
const PHONE_KEYWORDS = ["phone", "رقم", "الهاتف", "هاتف", "موبايل", "جوال", "mobile", "tel"];

/**
 * Turns a raw 2D sheet array (row 0 = headers, as produced by
 * `XLSX.utils.sheet_to_json(sheet, { header: 1 })`) into name+phone rows.
 * Column detection works by header keyword first, falling back to position
 * (col 0 = name, col 1 = phone) for files with no matching header — e.g. no
 * header row at all.
 */
export function parseExcelNameRows(raw: unknown[][]): { rows: ExcelNameRow[]; error: string | null } {
  if (raw.length < 2) return { rows: [], error: "الملف فارغ" };

  const headerRow = raw[0] ?? [];
  const headers = headerRow.map((h) => String(h ?? "").trim().toLowerCase());
  if (headers.length < 2) return { rows: [], error: "لم يتم العثور على عمود رقم الهاتف" };

  let nameIdx = headers.findIndex((h) => NAME_KEYWORDS.some((k) => h.includes(k)));
  let phoneIdx = headers.findIndex((h) => PHONE_KEYWORDS.some((k) => h.includes(k)));
  if (nameIdx === -1) nameIdx = 0;
  if (phoneIdx === -1) phoneIdx = 1;

  const rows: ExcelNameRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const line = raw[i] ?? [];
    const name = String(line[nameIdx] ?? "").trim();
    const phone = String(line[phoneIdx] ?? "").trim();
    if (!name && !phone) continue; // skip fully empty rows
    rows.push({ name, phone });
  }
  return { rows, error: null };
}
