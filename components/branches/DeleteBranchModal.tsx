"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deleteBranch } from "@/app/(admin)/branches/actions";
import { useToast } from "@/components/providers/toast-provider";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { BranchWithStats } from "@/types";

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-orange focus:outline-none";

export function DeleteBranchModal({ branch, onClose }: { branch: BranchWithStats; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setServerError(null);
    if (!password) {
      setServerError("يرجى إدخال كلمة المرور للتأكيد");
      return;
    }
    setLoading(true);
    const result = await deleteBranch(branch.id, password);
    setLoading(false);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["branches-with-stats"] });
    toast.success("تم حذف الفرع بنجاح");
    onClose();
  }

  return (
    <Modal title="حذف الفرع" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-brand-orange">
          هل أنت متأكد من حذف فرع &quot;{branch.name_ar}&quot;؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">كلمة مرور حسابك للتأكيد</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
        <SubmitButton variant="danger" onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري الحذف..." : "تأكيد الحذف"}
        </SubmitButton>
      </div>
    </Modal>
  );
}
