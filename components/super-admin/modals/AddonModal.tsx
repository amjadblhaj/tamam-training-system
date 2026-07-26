"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { addTenantBranchAddon } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function AddonModal({
  tenantId,
  onClose,
  onDone,
}: {
  tenantId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [branches, setBranches] = useState(1);
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await addTenantBranchAddon(tenantId, { branches, paymentRef });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تمت إضافة الفروع بنجاح");
    onDone();
  }

  return (
    <ModalShell title="إضافة فرع" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عدد الفروع">
          <input
            type="number"
            min={1}
            value={branches}
            onChange={(e) => setBranches(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="مرجع الدفع (اختياري)">
          <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className={inputClass} />
        </Field>
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري الإضافة..." : "تأكيد الإضافة"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
