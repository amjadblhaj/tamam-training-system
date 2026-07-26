"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transferStudent } from "@/app/(admin)/students/actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import { INPUT_CLASS } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { Branch } from "@/types";

export function TransferStudentButton({
  studentId,
  currentBranchId,
  branches,
}: {
  studentId: number;
  currentBranchId: number;
  branches: Branch[];
}) {
  const { canEdit } = useReadOnly();
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-brand-border px-4 py-1.5 text-sm font-medium text-brand-text transition-colors hover:bg-brand-surface-3"
      >
        نقل إلى فرع آخر
      </button>
      {open && (
        <TransferStudentModal
          studentId={studentId}
          currentBranchId={currentBranchId}
          branches={branches}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function TransferStudentModal({
  studentId,
  currentBranchId,
  branches,
  onClose,
}: {
  studentId: number;
  currentBranchId: number;
  branches: Branch[];
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [branchId, setBranchId] = useState<number>(currentBranchId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (branchId === currentBranchId) {
      onClose();
      return;
    }
    setError(null);
    setLoading(true);
    const result = await transferStudent(studentId, branchId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم نقل الطالب بنجاح");
    router.refresh();
    onClose();
  }

  return (
    <Modal title="نقل الطالب إلى فرع آخر" onClose={onClose} panelClassName="max-w-sm">
      <label className="mb-1 block text-sm font-medium text-brand-text">الفرع الجديد</label>
      <select value={branchId} onChange={(e) => setBranchId(Number(e.target.value))} className={INPUT_CLASS}>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name_ar}
          </option>
        ))}
      </select>

      {error && <p className="mt-2 text-sm text-brand-orange">{error}</p>}

      <SubmitButton onClick={handleSubmit} disabled={loading} className="mt-4">
        {loading ? "جاري النقل..." : "تأكيد النقل"}
      </SubmitButton>
    </Modal>
  );
}
