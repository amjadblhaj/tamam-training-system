"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { rewardSchema, type RewardInput, type RewardFormInput } from "@/lib/validations/reward";
import { createReward, updateReward } from "@/app/(admin)/rewards/actions";
import { useToast } from "@/components/providers/toast-provider";
import type { Reward } from "@/types";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">{reward ? "تعديل المكافأة" : "إضافة مكافأة جديدة"}</h2>
          <button onClick={onClose} className="text-brand-text-2 transition-colors hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="الاسم بالعربية" error={errors.nameAr?.message}>
            <input {...register("nameAr")} className={inputClass} />
          </Field>
          <Field label="الاسم بالإنجليزية" error={errors.nameEn?.message}>
            <input {...register("nameEn")} className={inputClass} />
          </Field>
          <Field label="الوصف" error={errors.description?.message}>
            <textarea {...register("description")} rows={3} className={inputClass} />
          </Field>
          <Field label="النقاط المطلوبة" error={errors.pointsRequired?.message}>
            <input {...register("pointsRequired")} type="number" min={1} className={inputClass} />
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
