"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateStudent } from "@/app/(admin)/students/actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";

export function DeactivateStudentButton({ studentId }: { studentId: number }) {
  const router = useRouter();
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [loading, setLoading] = useState(false);

  if (!canEdit) return null;

  async function handleClick() {
    if (!confirm("هل أنت متأكد من إلغاء تفعيل هذا الطالب؟")) return;
    setLoading(true);
    const result = await deactivateStudent(studentId);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم إلغاء تفعيل الطالب");
    router.push("/students");
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-lg border border-brand-orange px-4 py-1.5 text-sm font-medium text-brand-orange transition-colors hover:bg-brand-orange-light disabled:opacity-60"
    >
      {loading ? "جاري التنفيذ..." : "إلغاء تفعيل الطالب"}
    </button>
  );
}
