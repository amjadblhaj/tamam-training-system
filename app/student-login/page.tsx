"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentLoginSchema, type StudentLoginInput } from "@/lib/validations/auth";
import { loginStudent } from "@/app/login/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";

/**
 * Students' own entry point — the link/QR shared from the "روابط الطلاب"
 * page points here, so students never land on the staff login screen.
 */
export default function StudentLoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentLoginInput>({ resolver: zodResolver(studentLoginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await loginStudent(values);
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
          <p className="mt-2 text-sm text-brand-text-2">دخول الطلاب</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">رقم الهاتف</label>
            <Input {...register("phone")} type="tel" inputMode="numeric" autoComplete="tel" />
            {errors.phone && <p className="mt-1 text-xs text-brand-orange">{errors.phone.message}</p>}
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
