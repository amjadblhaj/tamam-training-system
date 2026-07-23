"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerStudentSchema, type RegisterStudentInput } from "@/lib/validations/register";
import { registerStudent } from "./actions";

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none";

export function RegisterClient({
  token,
  branchNameAr,
  academyName,
}: {
  token: string;
  branchNameAr: string;
  academyName: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStudentInput>({ resolver: zodResolver(registerStudentSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await registerStudent(token, values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    router.push(result.redirectTo ?? "/portal");
    router.refresh();
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-green">تمام</h1>
          <p className="mt-1 text-sm text-brand-text-2">{academyName}</p>
          <p className="mt-1 text-sm text-brand-text-2">التسجيل في فرع: {branchNameAr}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">الاسم الكامل</label>
            <input {...register("fullName")} className={inputClass} />
            {errors.fullName && <p className="mt-1 text-xs text-brand-orange">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">رقم الهاتف</label>
            <input {...register("phone")} type="tel" inputMode="numeric" autoComplete="tel" className={inputClass} />
            {errors.phone && <p className="mt-1 text-xs text-brand-orange">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">البريد الإلكتروني</label>
            <input {...register("email")} type="email" autoComplete="email" className={inputClass} />
            {errors.email && <p className="mt-1 text-xs text-brand-orange">{errors.email.message}</p>}
          </div>
          {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
          >
            {isSubmitting ? "جاري التسجيل..." : "تسجيل"}
          </button>
        </form>
      </div>
    </main>
  );
}
