"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { superAdminLoginSchema, type SuperAdminLoginInput } from "@/lib/validations/super-admin";
import { superAdminLogin } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuperAdminLoginInput>({ resolver: zodResolver(superAdminLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await superAdminLogin(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    router.push(result.redirectTo ?? "/super-admin/dashboard");
    router.refresh();
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-orange">مزايا</h1>
          <p className="mt-1 text-sm text-brand-text-2">لوحة تحكم المشرف العام</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">اسم المستخدم</label>
            <input
              {...register("username")}
              type="text"
              autoComplete="username"
              className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            />
            {errors.username && <p className="mt-1 text-xs text-brand-orange">{errors.username.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">كلمة المرور</label>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            />
            {errors.password && <p className="mt-1 text-xs text-brand-orange">{errors.password.message}</p>}
          </div>
          {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
          <SubmitButton variant="danger" disabled={isSubmitting}>
            {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
