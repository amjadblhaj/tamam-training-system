"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { reactivateTenantAccount } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function ReactivateModal({
  tenantId,
  onClose,
  onDone,
}: {
  tenantId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await reactivateTenantAccount(tenantId, months);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم إعادة تفعيل الحساب بنجاح");
    onDone();
  }

  return (
    <ModalShell title="إعادة تفعيل الحساب" onClose={onClose}>
      <div className="space-y-4">
        <Field label="المدة">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
            <option value={12}>12 شهر</option>
            <option value={6}>6 أشهر</option>
            <option value={3}>3 أشهر</option>
          </select>
        </Field>
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري التفعيل..." : "تأكيد إعادة التفعيل"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
