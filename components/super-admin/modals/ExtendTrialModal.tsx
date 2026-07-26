"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { extendTenantTrial } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function ExtendTrialModal({
  tenantId,
  onClose,
  onDone,
}: {
  tenantId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await extendTenantTrial(tenantId, days);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تمديد الفترة التجريبية");
    onDone();
  }

  return (
    <ModalShell title="تمديد الفترة التجريبية" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عدد الأيام الإضافية">
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري التمديد..." : "تأكيد التمديد"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
