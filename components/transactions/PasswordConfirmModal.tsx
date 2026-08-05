"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";

interface ConfirmableResult {
  success: boolean;
  error?: string;
}

interface PasswordConfirmModalProps<T extends ConfirmableResult> {
  title: string;
  /** The body content above the password field — details of what's being confirmed plus a warning box. */
  children: React.ReactNode;
  onClose: () => void;
  /** Called with the entered password; never checked client-side, only ever sent here for the server action to verify. */
  onConfirm: (password: string) => Promise<T>;
  onSuccess: (result: T) => void;
  confirmLabel?: string;
  confirmingLabel?: string;
}

/**
 * Generic password-gated confirmation modal — the current user's own
 * password is required before `onConfirm` runs, and the password itself is
 * never checked in the browser. Originally built for transaction undo (single
 * and bulk); reused as-is for student deletion by passing a different
 * title/body/onConfirm rather than growing this component per use case.
 */
export function PasswordConfirmModal<T extends ConfirmableResult>({
  title,
  children,
  onClose,
  onConfirm,
  onSuccess,
  confirmLabel = "تأكيد",
  confirmingLabel = "جاري التنفيذ...",
}: PasswordConfirmModalProps<T>) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setLoading(true);
    const result = await onConfirm(password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ ما");
      return;
    }
    onSuccess(result);
  }

  return (
    <Modal title={title} onClose={onClose} panelClassName="max-w-sm">
      <form onSubmit={handleConfirm} className="space-y-4">
        {children}

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">أدخل كلمة مرورك للتأكيد</label>
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="mt-1 text-xs text-brand-orange">{error}</p>}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-brand-border py-2.5 text-sm font-semibold text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            إلغاء
          </button>
          <SubmitButton variant="danger" disabled={loading || !password} className="flex-1">
            {loading ? confirmingLabel : confirmLabel}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
