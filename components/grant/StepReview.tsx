"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { StudentCode } from "@/components/students/StudentCode";
import { executeExcelWizardGrant } from "@/app/(admin)/excel/actions";
import type { GrantWizardApi } from "@/hooks/useGrantWizard";

export function StepReview({ wizard }: { wizard: GrantWizardApi }) {
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const result = wizard.processResult;
  if (!result) return null;

  const allNewSelected = result.newPhones.length > 0 && wizard.selectedNewPhones.size === result.newPhones.length;
  const totalPointsToGrant =
    result.existingMatches.reduce((sum, m) => sum + m.pointsToGrant, 0) +
    wizard.approvedNewPhones.reduce((sum, m) => sum + m.pointsToGrant, 0);

  async function handleConfirm() {
    setError(null);
    setIsExecuting(true);
    try {
      const response = await executeExcelWizardGrant(
        result!.branchId,
        result!.reason,
        result!.pointsPerOccurrence,
        result!.existingMatches,
        wizard.approvedNewPhones
      );
      if (!response.success || !response.result) {
        setError(response.error ?? "حدث خطأ أثناء تنفيذ العملية");
        return;
      }
      wizard.applyExecuteResult(response.result);
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="space-y-6">
      {result.existingMatches.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-brand-text">
            طلاب سيحصلون على النقاط ({result.existingMatches.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-right text-brand-text-2">
                  <th className="px-4 py-2 font-medium">الطالب</th>
                  <th className="px-4 py-2 font-medium">الكود</th>
                  <th className="px-4 py-2 font-medium">التكرار</th>
                  <th className="px-4 py-2 font-medium">النقاط</th>
                </tr>
              </thead>
              <tbody>
                {result.existingMatches.map((m) => (
                  <tr key={m.phone} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-2 text-brand-text">{m.name}</td>
                    <td className="px-4 py-2">
                      <StudentCode code={m.studentCode ?? null} />
                    </td>
                    <td className="px-4 py-2 text-brand-text-2">× {m.occurrences}</td>
                    <td className="px-4 py-2 font-semibold text-brand-green">+{m.pointsToGrant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.otherBranchSkipped.length > 0 && (
        <section className="rounded-xl border border-brand-orange bg-brand-orange-light p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-brand-orange">
            <AlertTriangle size={16} /> أرقام مسجلة في فرع آخر — تم تجاهلها ({result.otherBranchSkipped.length})
          </h3>
          <ul className="space-y-1 text-sm text-brand-text">
            {result.otherBranchSkipped.map((s) => (
              <li key={s.phone}>
                {s.phone} — {s.name} (مسجل في فرع آخر)
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.newPhones.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold text-brand-text">أرقام جديدة — هل تريد تسجيلهم كطلاب جدد في هذا الفرع؟</h3>
          <label className="mb-2 flex items-center gap-2 text-sm text-brand-text-2">
            <input type="checkbox" checked={allNewSelected} onChange={wizard.toggleAllNewPhones} />
            تحديد الكل
          </label>
          <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-right text-brand-text-2">
                  <th className="px-4 py-2 font-medium"></th>
                  <th className="px-4 py-2 font-medium">الاسم</th>
                  <th className="px-4 py-2 font-medium">رقم الهاتف</th>
                  <th className="px-4 py-2 font-medium">التكرار</th>
                  <th className="px-4 py-2 font-medium">النقاط عند الإضافة</th>
                </tr>
              </thead>
              <tbody>
                {result.newPhones.map((np) => (
                  <tr key={np.phone} className="border-b border-brand-border last:border-0">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={wizard.selectedNewPhones.has(np.phone)}
                        onChange={() => wizard.toggleNewPhone(np.phone)}
                      />
                    </td>
                    <td className="px-4 py-2 text-brand-text">{np.name}</td>
                    <td className="px-4 py-2 text-brand-text-2">{np.phone}</td>
                    <td className="px-4 py-2 text-brand-text-2">
                      تكرر {np.occurrences} {np.occurrences === 1 ? "مرة" : "مرات"}
                    </td>
                    <td className="px-4 py-2 font-semibold text-brand-green">+{np.pointsToGrant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.errors.length > 0 && (
        <section className="rounded-lg border border-brand-orange bg-brand-orange-light p-3 text-sm text-brand-orange">
          <ul className="space-y-1">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-4 rounded-xl border border-brand-border bg-brand-surface-2 p-4 text-sm text-brand-text">
        <span>طلاب حاليون: {result.existingMatches.length}</span>
        <span>طلاب جدد سيُضافون: {wizard.approvedNewPhones.length}</span>
        <span>تم تجاهلهم: {result.otherBranchSkipped.length}</span>
        <span className="font-semibold text-brand-green">إجمالي النقاط: {totalPointsToGrant}</span>
      </div>

      {error && <p className="text-sm text-brand-orange">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={wizard.goBack}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
        >
          رجوع
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isExecuting || !wizard.canProceedFromStep(5)}
          className="rounded-lg bg-brand-green px-6 py-2 text-sm font-semibold text-brand-dark transition active:scale-[0.98] hover:bg-brand-green-dark disabled:opacity-50 disabled:active:scale-100"
        >
          {isExecuting ? "جاري التنفيذ..." : "تأكيد ومنح النقاط"}
        </button>
      </div>
    </div>
  );
}
