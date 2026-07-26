"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { setTenantMaxBranches } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function MaxBranchesModal({
  tenantId,
  currentMax,
  onClose,
  onDone,
}: {
  tenantId: string;
  currentMax: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [unlimited, setUnlimited] = useState(currentMax === -1);
  const [maxBranches, setMaxBranches] = useState(currentMax === -1 ? 5 : currentMax);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await setTenantMaxBranches(tenantId, unlimited ? -1 : maxBranches);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تحديث الحد الأقصى للفروع");
    onDone();
  }

  return (
    <ModalShell title="تعديل الحد الأقصى للفروع" onClose={onClose}>
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-brand-text">
          <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} />
          غير محدود
        </label>
        {!unlimited && (
          <Field label="الحد الأقصى لعدد الفروع">
            <input
              type="number"
              min={1}
              value={maxBranches}
              onChange={(e) => setMaxBranches(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        )}
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
