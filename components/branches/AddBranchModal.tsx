"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { createBranchSchema, type CreateBranchInput } from "@/lib/validations/branch";
import { createBranch } from "@/app/(admin)/branches/actions";
import { useToast } from "@/components/providers/toast-provider";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";

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
    <Modal title="إضافة فرع جديد" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">اسم الفرع</label>
          <Input {...register("nameAr")} />
          {errors.nameAr && <p className="mt-1 text-xs text-brand-orange">{errors.nameAr.message}</p>}
        </div>
        {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? "جاري الحفظ..." : "حفظ"}</SubmitButton>
      </form>
    </Modal>
  );
}
