"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createStaffSchema, type CreateStaffInput } from "@/lib/validations/staff";
import { createStaff } from "@/app/(admin)/settings/actions";
import { useToast } from "@/components/providers/toast-provider";
import type { Branch } from "@/types";

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-text">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-orange">{error}</p>}
    </div>
  );
}

export function AddStaffModal({ branches, onClose }: { branches: Branch[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { role: "staff" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await createStaff(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    toast.success("تمت إضافة الموظف بنجاح");
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">إضافة موظف جديد</h2>
          <button onClick={onClose} className="text-brand-text-2 transition-colors hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="اسم المستخدم" error={errors.username?.message}>
            <input {...register("username")} className={inputClass} />
          </Field>
          <Field label="كلمة المرور" error={errors.password?.message}>
            <input {...register("password")} type="password" className={inputClass} />
          </Field>
          <Field label="الصلاحية" error={errors.role?.message}>
            <select {...register("role")} className={inputClass}>
              <option value="staff">موظف</option>
              <option value="admin">مدير</option>
            </select>
          </Field>
          <Field label="الفرع (اختياري)" error={errors.branchId?.message}>
            <select {...register("branchId")} defaultValue="" className={inputClass}>
              <option value="">بدون فرع محدد</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
          </Field>
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
