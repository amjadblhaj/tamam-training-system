"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateStudent } from "@/app/(admin)/students/actions";

export function DeactivateStudentButton({ studentId }: { studentId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("هل أنت متأكد من إلغاء تفعيل هذا الطالب؟")) return;
    setLoading(true);
    const result = await deactivateStudent(studentId);
    setLoading(false);
    if (result.success) {
      router.push("/students");
      router.refresh();
    }
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
