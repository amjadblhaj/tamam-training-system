"use client";

import * as XLSX from "xlsx";
import { CheckCircle2, Download } from "lucide-react";
import type { GrantWizardApi } from "@/hooks/useGrantWizard";

export function ResultScreen({ wizard }: { wizard: GrantWizardApi }) {
  const result = wizard.executeResult;
  if (!result) return null;

  function exportCredentials() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      result!.created.map((c) => ({
        الاسم: c.name,
        الكود: c.code,
        "الهاتف (للدخول)": c.phone,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Credentials");
    XLSX.writeFile(wb, "بيانات_دخول_الطلاب_الجدد.xlsx");
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-col items-center rounded-xl border border-brand-border bg-brand-surface p-8 text-center">
        <CheckCircle2 size={40} className="mb-3 text-brand-green" />
        <h2 className="mb-4 text-lg font-bold text-brand-text">تمت العملية بنجاح</h2>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-brand-text">
          <span>طلاب جدد تم تسجيلهم: {result.createdCount}</span>
          <span>طلاب حصلوا على نقاط: {result.grantedCount}</span>
          <span className="font-semibold text-brand-green">إجمالي النقاط الممنوحة: {result.totalPoints}</span>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="mb-6 rounded-lg border border-brand-orange bg-brand-orange-light p-3 text-sm text-brand-orange">
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result.created.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-1 font-semibold text-brand-text">بيانات دخول الطلاب الجدد</h3>
          <p className="mb-3 text-xs text-brand-text-3">اسم المستخدم وكلمة المرور = رقم الهاتف</p>
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-right text-brand-text-2">
                  <th className="px-4 py-2 font-medium">الاسم</th>
                  <th className="px-4 py-2 font-medium">الكود</th>
                  <th className="px-4 py-2 font-medium">الهاتف (للدخول)</th>
                </tr>
              </thead>
              <tbody>
                {result.created.map((c) => (
                  <tr key={c.phone} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-2 text-brand-text">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-xs text-brand-text">{c.code}</td>
                    <td className="px-4 py-2 text-brand-text-2">{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={exportCredentials}
            className="mt-3 flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            <Download size={16} /> تصدير بيانات الدخول (Excel)
          </button>
        </section>
      )}

      <button
        onClick={wizard.reset}
        className="rounded-lg bg-brand-green px-6 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-green-dark"
      >
        عملية جديدة
      </button>
    </div>
  );
}
