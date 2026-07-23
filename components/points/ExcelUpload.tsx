"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useMutation } from "@tanstack/react-query";
import { UploadCloud, Download, CheckCircle2, XCircle } from "lucide-react";
import { processExcelBatch } from "@/app/(admin)/excel/actions";
import { useReadOnly } from "@/hooks/useReadOnly";
import { ReadOnlyPlaceholder } from "@/components/shared/ReadOnlyPlaceholder";
import type { ExcelRowInput, ExcelProcessResult } from "@/types";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const VALID_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "",
];

export function ExcelUpload() {
  const { canEdit } = useReadOnly();
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<ExcelProcessResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: (rows: ExcelRowInput[]) => processExcelBatch(rows),
    onSuccess: (data) => setResult(data),
  });

  async function handleFile(file: File) {
    setValidationError(null);
    setResult(null);

    const validExt = /\.(xlsx|xls)$/i.test(file.name);
    const validMime = VALID_MIME_TYPES.includes(file.type);
    if (!validExt || !validMime) {
      setValidationError("يرجى رفع ملف بصيغة xlsx أو xls فقط");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setValidationError("حجم الملف يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

    const parsedRows: ExcelRowInput[] = [];
    for (let i = 1; i < rows.length; i++) {
      const [phone, points, reason] = (rows[i] ?? []) as [unknown, unknown, unknown];
      if (!phone && !points) continue;
      parsedRows.push({
        phone: String(phone ?? "").trim(),
        points: parseInt(String(points ?? ""), 10),
        reason: String(reason ?? "").trim(),
        rowNumber: i + 1,
      });
    }

    mutate(parsedRows);
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["رقم الهاتف", "النقاط", "السبب"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "نموذج_استيراد_النقاط.xlsx");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex justify-end">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
        >
          <Download size={16} /> تنزيل نموذج فارغ
        </button>
      </div>

      {canEdit ? (
        <>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragActive ? "border-brand-green bg-brand-green-light" : "border-brand-border bg-brand-surface"
            }`}
          >
            <UploadCloud size={32} className="text-brand-text-3" />
            <p className="text-sm text-brand-text">اسحب وأفلت ملف الإكسل هنا أو اضغط للاختيار</p>
            <p className="text-xs text-brand-text-3">xlsx أو xls — بحد أقصى 5 ميجابايت</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {isPending && <p className="mt-4 text-sm text-brand-text-2">جاري معالجة الملف...</p>}
          {validationError && <p className="mt-4 text-sm text-brand-orange">{validationError}</p>}

          {result && (
            <div className="mt-4 space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-brand-green">
                <CheckCircle2 size={16} /> تم تحديث {result.successCount} طالب بنجاح
              </p>
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-brand-orange bg-brand-orange-light p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-brand-orange">
                    <XCircle size={16} /> {result.errors.length} خطأ
                  </p>
                  <ul className="space-y-1 text-xs text-brand-orange">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <ReadOnlyPlaceholder message="رفع الملفات غير متاح في وضع القراءة" />
      )}
    </div>
  );
}
