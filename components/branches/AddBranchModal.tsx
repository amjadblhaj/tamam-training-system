"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createBranchSchema, type CreateBranchInput } from "@/lib/validations/branch";
import { createBranch } from "@/app/(admin)/branches/actions";
import { useToast } from "@/components/providers/toast-provider";

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none";

export function AddBranchModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchInput>({ resolver: zodResolver(createBranchSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await createBranch(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["branches-with-stats"] });
    toast.success("تمت إضافة الفرع بنجاح");
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">إضافة فرع جديد</h2>
          <button onClick={onClose} className="text-brand-text-2 transition-colors hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">اسم الفرع</label>
            <input {...register("nameAr")} className={inputClass} />
            {errors.nameAr && <p className="mt-1 text-xs text-brand-orange">{errors.nameAr.message}</p>}
          </div>
          {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </button>
        </form>
      </div>
    </div>
  );
}
