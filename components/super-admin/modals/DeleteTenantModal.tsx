"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { deleteTenant } from "@/lib/actions/super-admin-tenants";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function DeleteTenantModal({
  tenantId,
  academyName,
  onClose,
  onDeleted,
}: {
  tenantId: string;
  academyName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const canDelete = confirmText.trim() === academyName;

  async function handleConfirm() {
    if (!canDelete) return;
    setLoading(true);
    const result = await deleteTenant(tenantId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم حذف الحساب نهائيًا");
    onDeleted();
  }

  return (
    <ModalShell title="حذف الحساب نهائيًا" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-brand-orange">
          هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بيانات &quot;{academyName}&quot; (الطلاب،
          الفروع، الموظفون، سجل النقاط، المكافآت) بشكل دائم.
        </p>
        <Field label={`اكتب اسم الأكاديمية للتأكيد: "${academyName}"`}>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          onClick={handleConfirm}
          disabled={!canDelete || loading}
          className="w-full rounded-lg bg-brand-orange py-2.5 font-semibold text-brand-dark transition-colors hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "جاري الحذف..." : "حذف نهائيًا"}
        </button>
      </div>
    </ModalShell>
  );
}
