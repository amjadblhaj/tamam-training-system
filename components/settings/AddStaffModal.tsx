"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { createStaffSchema, type CreateStaffInput } from "@/lib/validations/staff";
import { createStaff } from "@/app/(admin)/settings/actions";
import { useToast } from "@/components/providers/toast-provider";
import { Input, INPUT_CLASS } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { Branch } from "@/types";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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
    <Modal title="إضافة موظف جديد" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="اسم المستخدم" error={errors.username?.message}>
          <Input {...register("username")} />
        </Field>
        <Field label="كلمة المرور" error={errors.password?.message}>
          <Input {...register("password")} type="password" />
        </Field>
        <Field label="الصلاحية" error={errors.role?.message}>
          <select {...register("role")} className={INPUT_CLASS}>
            <option value="staff">موظف</option>
            <option value="admin">مدير</option>
          </select>
        </Field>
        <Field label="الفرع (اختياري)" error={errors.branchId?.message}>
          <select {...register("branchId")} defaultValue="" className={INPUT_CLASS}>
            <option value="">بدون فرع محدد</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar}
              </option>
            ))}
          </select>
        </Field>
        {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? "جاري الحفظ..." : "حفظ"}</SubmitButton>
      </form>
    </Modal>
  );
}
