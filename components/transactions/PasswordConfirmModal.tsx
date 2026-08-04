"use client";

import { useState } from "react";
import { undoTransaction, bulkUndoTransactions } from "@/app/(admin)/activity/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { ActivityLogRow, BulkUndoResponse } from "@/types";

interface PasswordConfirmModalProps {
  onClose: () => void;
  /** Single-undo mode result is always `{ success: true }`; bulk mode passes the succeeded/skipped summary through. */
  onSuccess: (bulkResult?: BulkUndoResponse) => void;
  /** Single-transaction mode — undoes just this one row. */
  transaction?: ActivityLogRow;
  /** Bulk mode — undoes every id in one password check. Takes precedence if both are somehow passed. */
  bulkIds?: number[];
}

/**
 * Confirms an undo with the CURRENT user's own password. The password is
 * only ever sent to the server action for verification there — it's never
 * checked in the browser. Reused for both a single row and a bulk selection
 * (see BulkActionBar) rather than duplicating the password-entry UI.
 */
export function PasswordConfirmModal({ transaction, bulkIds, onClose, onSuccess }: PasswordConfirmModalProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBulk = !!bulkIds && bulkIds.length > 0;

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setLoading(true);

    if (isBulk) {
      const result = await bulkUndoTransactions(bulkIds!, password);
      setLoading(false);
      if (!result.success) {
        setError(result.error ?? "حدث خطأ ما");
        return;
      }
      onSuccess(result);
      return;
    }

    const result = await undoTransaction(transaction!.id, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ ما");
      return;
    }
    onSuccess();
  }

  return (
    <Modal title="تأكيد التراجع عن الحركة" onClose={onClose} panelClassName="max-w-sm">
      <form onSubmit={handleConfirm} className="space-y-4">
        {isBulk ? (
          <div className="rounded-lg border border-brand-orange bg-brand-orange-light px-3 py-2 text-sm text-brand-text">
            سيتم التراجع عن {bulkIds!.length} حركة وتسجيل حركة عكسية لكل واحدة منها
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-3 text-sm">
              <p className="font-semibold text-brand-text">
                {transaction!.student_name}
                {transaction!.student_code && (
                  <span className="mr-2 rounded bg-brand-surface-3 px-1.5 py-0.5 font-mono text-xs text-brand-text-2">
                    {transaction!.student_code}
                  </span>
                )}
              </p>
              <p className="mt-1 text-brand-text-2">{transaction!.action}</p>
              <p className="mt-1 text-brand-text-2">{new Date(transaction!.created_at).toLocaleString("ar")}</p>
            </div>

            <div className="rounded-lg border border-brand-orange bg-brand-orange-light px-3 py-2 text-sm text-brand-text">
              {transaction!.points >= 0
                ? `سيتم خصم ${transaction!.points} نقطة من رصيد الطالب وتسجيل حركة عكسية`
                : `سيتم إضافة ${-transaction!.points} نقطة إلى رصيد الطالب وتسجيل حركة عكسية`}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">أدخل كلمة مرورك للتأكيد</label>
          <Input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
            {loading ? "جاري التراجع..." : "تأكيد التراجع"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
