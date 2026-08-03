"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { UploadCloud, Download } from "lucide-react";
import { parseExcelNameRows } from "@/lib/excel/parseExcelRows";
import { processExcelWizardBatch } from "@/app/(admin)/excel/actions";
import { WizardNavButtons } from "./WizardNavButtons";
import type { GrantWizardApi } from "@/hooks/useGrantWizard";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const VALID_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "",
];

export function StepUpload({ wizard }: { wizard: GrantWizardApi }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);

    const validExt = /\.(xlsx|xls)$/i.test(file.name);
    const validMime = VALID_MIME_TYPES.includes(file.type);
    if (!validExt || !validMime) {
      setError("يرجى رفع ملف بصيغة xlsx أو xls فقط");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("حجم الملف يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

      const { rows, error: parseError } = parseExcelNameRows(raw);
      if (parseError) {
        setError(parseError);
        return;
      }

      const response = await processExcelWizardBatch(
        rows,
        wizard.branchId as number,
        wizard.points,
        wizard.resolvedReasonLabel
      );
      if (!response.success || !response.result) {
        setError(response.error ?? "حدث خطأ أثناء معالجة الملف");
        return;
      }

      wizard.applyProcessResult(response.result);
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["الاسم", "رقم الهاتف"]]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "نموذج_منح_النقاط.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand-border bg-brand-surface-2 px-3 py-2 text-sm text-brand-text-2">
        الملف يجب أن يحتوي على: عمود الاسم + عمود رقم الهاتف (الأعمدة الأخرى يتم تجاهلها)
      </div>

      <div className="flex justify-end">
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
        >
          <Download size={16} /> تحميل نموذج فارغ
        </button>
      </div>

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

      {isProcessing && <p className="text-sm text-brand-text-2">جاري معالجة الملف...</p>}
      {error && <p className="text-sm text-brand-orange">{error}</p>}

      <WizardNavButtons onBack={wizard.goBack} onNext={wizard.goNext} canProceed={false} hideNext />
    </div>
  );
}
