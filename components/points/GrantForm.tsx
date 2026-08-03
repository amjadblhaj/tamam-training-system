"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Search, User } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  grantPointsSchema,
  GRANT_REASONS,
  type GrantPointsFormInput,
  type GrantPointsInput,
} from "@/lib/validations/points";
import { searchStudentsForGrant, grantPoints } from "@/app/(admin)/grant/actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import { ReadOnlyPlaceholder } from "@/components/shared/ReadOnlyPlaceholder";
import { Input, INPUT_CLASS } from "@/components/ui/Input";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { StudentSearchResult } from "@/types";

export function GrantForm() {
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: results, isFetching: isSearching } = useQuery({
    queryKey: ["grant-student-search", debouncedSearch],
    queryFn: () => searchStudentsForGrant(debouncedSearch),
    enabled: debouncedSearch.length > 0 && dropdownOpen,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GrantPointsFormInput, unknown, GrantPointsInput>({
    resolver: zodResolver(grantPointsSchema),
    defaultValues: { reason: "course_registration" },
  });

  const reason = watch("reason");

  useEffect(() => {
    const preset = GRANT_REASONS.find((r) => r.value === reason);
    if (preset?.defaultPoints) {
      setValue("points", preset.defaultPoints as unknown as GrantPointsFormInput["points"]);
    }
  }, [reason, setValue]);

  if (!canEdit) {
    return <ReadOnlyPlaceholder message="منح النقاط غير متاح في وضع القراءة" />;
  }

  function selectStudent(student: StudentSearchResult) {
    setSelectedStudent(student);
    setValue("studentId", student.id as unknown as GrantPointsFormInput["studentId"]);
    setSearch(student.full_name);
    setDropdownOpen(false);
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await grantPoints(values);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success(`تم منح النقاط لـ ${result.studentName}. الرصيد الجديد: ${result.newBalance}`);
    setSelectedStudent(null);
    setSearch("");
    reset({ reason: "course_registration" });
  });

  return (
    <div className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-brand-text">الطالب</label>
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-3" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedStudent(null);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="ابحث بالاسم أو رقم الهاتف أو الكود"
              className="pr-9"
            />
          </div>
          {dropdownOpen && isSearching && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text-3 shadow-lg">
              جاري البحث...
            </div>
          )}
          {dropdownOpen && !isSearching && results && results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-brand-border bg-brand-surface shadow-lg">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectStudent(s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-brand-surface-3"
                  >
                    <span className="flex items-center gap-2 text-brand-text">
                      <User size={14} className="text-brand-text-3" />
                      {s.full_name}
                      {s.student_code && (
                        <span className="rounded bg-brand-surface-3 px-1.5 py-0.5 font-mono text-xs text-brand-text-2">
                          {s.student_code}
                        </span>
                      )}
                      <span className="text-brand-text-3">({s.branch_name_ar})</span>
                    </span>
                    <span className="font-semibold text-brand-orange">{s.points}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {dropdownOpen && !isSearching && results && results.length === 0 && debouncedSearch.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text-3 shadow-lg">
              لا يوجد طلاب مطابقون
            </div>
          )}
          {errors.studentId && <p className="mt-1 text-xs text-brand-orange">{errors.studentId.message}</p>}
        </div>

        {selectedStudent && (
          <div className="rounded-lg border border-brand-border bg-brand-green-light px-3 py-2 text-sm text-brand-text">
            الطالب المحدد: <span className="font-semibold">{selectedStudent.full_name}</span> — الرصيد الحالي:{" "}
            <span className="font-semibold text-brand-orange">{selectedStudent.points}</span>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">السبب</label>
          <Controller
            control={control}
            name="reason"
            render={({ field }) => (
              <select {...field} className={INPUT_CLASS}>
                {GRANT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        {reason === "custom" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">وصف السبب</label>
            <Input {...register("customReason")} />
            {errors.customReason && (
              <p className="mt-1 text-xs text-brand-orange">{errors.customReason.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-brand-text">النقاط</label>
          <Input {...register("points")} type="number" min={1} max={9999} />
          {errors.points && <p className="mt-1 text-xs text-brand-orange">{errors.points.message}</p>}
        </div>

        <SubmitButton disabled={isSubmitting || !selectedStudent}>
          {isSubmitting ? "جاري المنح..." : "منح النقاط"}
        </SubmitButton>
      </form>
    </div>
  );
}
