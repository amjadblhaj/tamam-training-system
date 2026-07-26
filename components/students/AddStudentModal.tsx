"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  createStudentSchema,
  type CreateStudentInput,
  type CreateStudentFormInput,
} from "@/lib/validations/student";
import { createStudent } from "@/app/(admin)/students/actions";
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

export function AddStudentModal({ branches, onClose }: { branches: Branch[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateStudentFormInput, unknown, CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await createStudent(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["students"] });
    toast.success("تمت إضافة الطالب بنجاح");
    onClose();
  });

  return (
    <Modal title="إضافة طالب جديد" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="الاسم الكامل" error={errors.fullName?.message}>
          <Input {...register("fullName")} />
        </Field>
        <Field label="رقم الهاتف" error={errors.phone?.message}>
          <Input {...register("phone")} type="tel" inputMode="numeric" />
        </Field>
        <Field label="الفرع" error={errors.branchId?.message}>
          <select {...register("branchId")} defaultValue="" className={INPUT_CLASS}>
            <option value="" disabled>
              اختر الفرع
            </option>
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
