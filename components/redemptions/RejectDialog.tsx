"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { RedemptionQueueRow } from "@/types";

interface RejectDialogProps {
  redemption: RedemptionQueueRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

/** Optional-reason confirmation before rejecting a redemption — rejecting always refunds the points. */
export function RejectDialog({ redemption, onClose, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ ما");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="رفض طلب الاستبدال" onClose={onClose} panelClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-3 text-sm">
          <p className="font-semibold text-brand-text">{redemption.student_name}</p>
          <p className="mt-1 text-brand-text-2">{redemption.reward_name_ar}</p>
        </div>

        <div className="rounded-lg border border-brand-orange bg-brand-orange-light px-3 py-2 text-sm text-brand-text">
          سيتم إرجاع {redemption.points_required} نقطة إلى رصيد الطالب
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">سبب الرفض (اختياري)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
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
          <SubmitButton variant="danger" disabled={loading} className="flex-1">
            {loading ? "جاري الرفض..." : "تأكيد الرفض"}
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
