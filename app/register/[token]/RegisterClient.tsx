"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerStudentSchema, type RegisterStudentInput } from "@/lib/validations/register";
import { registerStudent } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

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
          <p className="mt-2 text-sm text-brand-text-2">{academyName}</p>
          <p className="mt-1 text-sm text-brand-text-2">التسجيل في فرع: {branchNameAr}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">الاسم الكامل</label>
            <Input {...register("fullName")} />
            {errors.fullName && <p className="mt-1 text-xs text-brand-orange">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">رقم الهاتف</label>
            <Input {...register("phone")} type="tel" inputMode="numeric" autoComplete="tel" />
            {errors.phone && <p className="mt-1 text-xs text-brand-orange">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">البريد الإلكتروني</label>
            <Input {...register("email")} type="email" autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-brand-orange">{errors.email.message}</p>}
          </div>
          {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
          <SubmitButton disabled={isSubmitting}>{isSubmitting ? "جاري التسجيل..." : "تسجيل"}</SubmitButton>
        </form>
      </div>
    </main>
  );
}
