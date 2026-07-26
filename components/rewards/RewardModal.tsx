"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { rewardSchema, type RewardInput, type RewardFormInput } from "@/lib/validations/reward";
import { createReward, updateReward } from "@/app/(admin)/rewards/actions";
import { useToast } from "@/components/providers/toast-provider";
import { Input, INPUT_CLASS } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Modal } from "@/components/ui/Modal";
import type { Reward } from "@/types";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-text">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-orange">{error}</p>}
    </div>
  );
}

export function RewardModal({ reward, onClose }: { reward: Reward | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RewardFormInput, unknown, RewardInput>({
    resolver: zodResolver(rewardSchema),
    defaultValues: reward
      ? {
          nameAr: reward.name_ar,
          nameEn: reward.name_en,
          description: reward.description ?? "",
          pointsRequired: reward.points_required as unknown as RewardFormInput["pointsRequired"],
        }
      : undefined,
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = reward ? await updateReward(reward.id, values) : await createReward(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
    toast.success(reward ? "تم تحديث المكافأة بنجاح" : "تمت إضافة المكافأة بنجاح");
    onClose();
  });

  return (
    <Modal title={reward ? "تعديل المكافأة" : "إضافة مكافأة جديدة"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="الاسم بالعربية" error={errors.nameAr?.message}>
          <Input {...register("nameAr")} />
        </Field>
        <Field label="الاسم بالإنجليزية" error={errors.nameEn?.message}>
          <Input {...register("nameEn")} />
        </Field>
        <Field label="الوصف" error={errors.description?.message}>
          <textarea {...register("description")} rows={3} className={INPUT_CLASS} />
        </Field>
        <Field label="النقاط المطلوبة" error={errors.pointsRequired?.message}>
          <Input {...register("pointsRequired")} type="number" min={1} />
        </Field>
        {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
        <SubmitButton disabled={isSubmitting}>{isSubmitting ? "جاري الحفظ..." : "حفظ"}</SubmitButton>
      </form>
    </Modal>
  );
}
