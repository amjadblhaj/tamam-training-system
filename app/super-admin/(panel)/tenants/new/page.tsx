"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy } from "lucide-react";
import { createTenant } from "@/lib/actions/super-admin-tenants";
import { useToast } from "@/components/providers/toast-provider";
import type { CreateTenantInput } from "@/types";

const schema = z.object({
  academyName: z.string().min(2, "اسم الأكاديمية مطلوب"),
  academyNameEn: z.string().optional(),
  ownerName: z.string().min(2, "اسم المالك مطلوب"),
  ownerEmail: z.string().email("بريد إلكتروني غير صحيح"),
  ownerPhone: z.string().optional(),
  trialDays: z.coerce.number().int().positive(),
  adminUsername: z.string().min(3, "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل"),
  adminPassword: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف"),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-orange focus:outline-none";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-text">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-brand-orange">{error}</p>}
    </div>
  );
}

export default function NewTenantPage() {
  const router = useRouter();
  const toast = useToast();
  const [credentials, setCredentials] = useState<{ username: string; password: string; academyName: string } | null>(
    null
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { trialDays: 14 },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createTenant(values as CreateTenantInput);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    setCredentials(result.credentials ?? null);
    toast.success("تم إنشاء الحساب بنجاح");
  });

  if (credentials) {
    return (
      <div className="max-w-lg rounded-xl border border-brand-border bg-brand-surface p-6">
        <h1 className="mb-4 text-xl font-bold text-brand-text">تم إنشاء الحساب — أرسل بيانات الدخول للعميل</h1>
        <div className="space-y-3 rounded-lg bg-brand-surface-3 p-4 text-sm">
          <p>
            <span className="text-brand-text-2">الأكاديمية:</span>{" "}
            <span className="font-semibold text-brand-text">{credentials.academyName}</span>
          </p>
          <p>
            <span className="text-brand-text-2">اسم المستخدم:</span>{" "}
            <span className="font-semibold text-brand-text">{credentials.username}</span>
          </p>
          <p>
            <span className="text-brand-text-2">كلمة المرور:</span>{" "}
            <span className="font-semibold text-brand-text">{credentials.password}</span>
          </p>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `اسم المستخدم: ${credentials.username}\nكلمة المرور: ${credentials.password}`
              );
              toast.success("تم النسخ");
            }}
            className="flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            <Copy size={16} /> نسخ البيانات
          </button>
          <button
            onClick={() => router.push("/super-admin/tenants")}
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            الذهاب لقائمة العملاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-brand-text">إضافة عميل جديد</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-brand-border bg-brand-surface p-6">
        <Field label="اسم الأكاديمية (عربي)" error={errors.academyName?.message}>
          <input {...register("academyName")} className={inputClass} />
        </Field>
        <Field label="اسم الأكاديمية (إنجليزي)" error={errors.academyNameEn?.message}>
          <input {...register("academyNameEn")} className={inputClass} />
        </Field>
        <Field label="اسم المالك" error={errors.ownerName?.message}>
          <input {...register("ownerName")} className={inputClass} />
        </Field>
        <Field label="البريد الإلكتروني" error={errors.ownerEmail?.message}>
          <input {...register("ownerEmail")} type="email" className={inputClass} />
        </Field>
        <Field label="رقم الهاتف (اختياري)" error={errors.ownerPhone?.message}>
          <input {...register("ownerPhone")} className={inputClass} />
        </Field>
        <Field label="مدة الفترة التجريبية" error={errors.trialDays?.message}>
          <select {...register("trialDays")} className={inputClass}>
            <option value={7}>7 أيام</option>
            <option value={14}>14 يومًا</option>
            <option value={30}>30 يومًا</option>
          </select>
        </Field>
        <Field label="اسم مستخدم المدير" error={errors.adminUsername?.message}>
          <input {...register("adminUsername")} className={inputClass} />
        </Field>
        <Field label="كلمة مرور المدير" error={errors.adminPassword?.message}>
          <input {...register("adminPassword")} type="password" className={inputClass} />
        </Field>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-orange py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "جاري الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </div>
  );
}
