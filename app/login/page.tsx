"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { staffLoginSchema, type StaffLoginInput } from "@/lib/validations/auth";
import { loginStaff } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95 rounded-2xl bg-brand-surface p-8 shadow-xl duration-300">
        <div className="mb-6 text-center">
          <Image
            src="/logo-full.png"
            alt="تمام"
            width={200}
            height={100}
            className="mx-auto h-auto w-[200px]"
            priority
          />
          <p className="mt-2 text-sm text-brand-text-2">دخول الموظفين</p>
        </div>

        <StaffLoginForm />
      </div>
    </main>
  );
}

function StaffLoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StaffLoginInput>({ resolver: zodResolver(staffLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await loginStaff(values);
    if (!result.success) {
      setServerError(result.error ?? "حدث خطأ ما");
      return;
    }
    router.push(result.redirectTo ?? "/dashboard");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">اسم المستخدم</label>
        <Input {...register("username")} type="text" autoComplete="username" />
        {errors.username && <p className="mt-1 text-xs text-brand-orange">{errors.username.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">كلمة المرور</label>
        <Input {...register("password")} type="password" autoComplete="current-password" />
        {errors.password && <p className="mt-1 text-xs text-brand-orange">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
      <SubmitButton disabled={isSubmitting}>{isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}</SubmitButton>
    </form>
  );
}
