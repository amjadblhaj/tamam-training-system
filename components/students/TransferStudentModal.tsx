"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { transferStudent } from "@/app/(admin)/students/actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-brand-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">نقل الطالب إلى فرع آخر</h2>
          <button onClick={onClose} className="text-brand-text-2 transition-colors hover:text-brand-text">
            <X size={20} />
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-brand-text">الفرع الجديد</label>
        <select
          value={branchId}
          onChange={(e) => setBranchId(Number(e.target.value))}
          className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name_ar}
            </option>
          ))}
        </select>

        {error && <p className="mt-2 text-sm text-brand-orange">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "جاري النقل..." : "تأكيد النقل"}
        </button>
      </div>
    </div>
  );
}
