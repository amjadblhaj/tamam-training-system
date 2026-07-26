"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { activateTenantSubscription } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function ActivateModal({
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
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await activateTenantSubscription(tenantId, { months, paymentRef });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تفعيل الاشتراك بنجاح");
    onDone();
  }

  return (
    <ModalShell title="تفعيل اشتراك" onClose={onClose}>
      <div className="space-y-4">
        <Field label="المدة">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
            <option value={12}>12 شهر</option>
            <option value={6}>6 أشهر</option>
            <option value={3}>3 أشهر</option>
            <option value={1}>شهر واحد</option>
          </select>
        </Field>
        <Field label="مرجع الدفع (اختياري)">
          <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className={inputClass} />
        </Field>
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري التفعيل..." : "تأكيد التفعيل"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
