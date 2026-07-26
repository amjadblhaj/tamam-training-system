"use client";

import { useState } from "react";
import { useToast } from "@/components/providers/toast-provider";
import { resetStaffPassword } from "@/lib/actions/super-admin-tenants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ModalShell, Field, inputClass } from "./ModalShell";

export function ResetPasswordModal({
  staffId,
  username,
  onClose,
  onDone,
}: {
  staffId: string;
  username: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (password.length < 6) {
      toast.error("كلمة المرور يجب ألا تقل عن 6 أحرف");
      return;
    }
    setLoading(true);
    const result = await resetStaffPassword(staffId, password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success(`تم تغيير كلمة مرور "${username}" بنجاح`);
    onDone();
  }

  return (
    <ModalShell title={`تغيير كلمة مرور: ${username}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="كلمة المرور الجديدة">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <SubmitButton onClick={handleConfirm} disabled={loading}>
          {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
        </SubmitButton>
      </div>
    </ModalShell>
  );
}
