"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  staffLoginSchema,
  studentLoginSchema,
  type StaffLoginInput,
  type StudentLoginInput,
} from "@/lib/validations/auth";
import { loginStaff, loginStudent } from "./actions";

type Mode = "staff" | "student";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("staff");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-brand-green">تمام</h1>
          <p className="mt-1 text-sm text-brand-text-2">أكاديمية قرار للتدريب والتطوير</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-brand-surface-3 p-1">
          <button
            type="button"
            onClick={() => setMode("staff")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "staff" ? "bg-brand-green text-white" : "text-brand-text-2"
            }`}
          >
            الموظفون
          </button>
          <button
            type="button"
            onClick={() => setMode("student")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "student" ? "bg-brand-green text-white" : "text-brand-text-2"
            }`}
          >
            الطلاب
          </button>
        </div>

        {mode === "staff" ? <StaffLoginForm /> : <StudentLoginForm />}
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
        <input
          {...register("username")}
          type="text"
          autoComplete="username"
          className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none"
        />
        {errors.username && <p className="mt-1 text-xs text-brand-orange">{errors.username.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">كلمة المرور</label>
        <input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none"
        />
        {errors.password && <p className="mt-1 text-xs text-brand-orange">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
      >
        {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}

function StudentLoginForm() {
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
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">رقم الهاتف</label>
        <input
          {...register("phone")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none"
        />
        {errors.phone && <p className="mt-1 text-xs text-brand-orange">{errors.phone.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-text">كلمة المرور</label>
        <input
          {...register("password")}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-green focus:outline-none"
        />
        {errors.password && <p className="mt-1 text-xs text-brand-orange">{errors.password.message}</p>}
      </div>
      {serverError && <p className="text-sm text-brand-orange">{serverError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-orange py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
      </button>
    </form>
  );
}
