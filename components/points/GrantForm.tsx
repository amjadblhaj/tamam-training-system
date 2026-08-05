"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Search, User, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  grantPointsFieldsSchema,
  GRANT_REASONS,
  type GrantPointsFieldsFormInput,
  type GrantPointsFieldsInput,
} from "@/lib/validations/points";
import { searchStudentsForGrant, grantPointsBatch } from "@/app/(admin)/grant/actions";
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
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);
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
  } = useForm<GrantPointsFieldsFormInput, unknown, GrantPointsFieldsInput>({
    resolver: zodResolver(grantPointsFieldsSchema),
    defaultValues: { reason: "course_registration" },
  });

  const reason = watch("reason");

  useEffect(() => {
    const preset = GRANT_REASONS.find((r) => r.value === reason);
    if (preset?.defaultPoints) {
      setValue("points", preset.defaultPoints as unknown as GrantPointsFieldsFormInput["points"]);
    }
  }, [reason, setValue]);

  if (!canEdit) {
    return <ReadOnlyPlaceholder message="منح النقاط غير متاح في وضع القراءة" />;
  }

  function addStudent(student: StudentSearchResult) {
    setSelectedStudents((prev) => (prev.some((s) => s.id === student.id) ? prev : [...prev, student]));
    setSearch("");
    setDropdownOpen(false);
  }

  function removeStudent(id: number) {
    setSelectedStudents((prev) => prev.filter((s) => s.id !== id));
  }

  const onSubmit = handleSubmit(async (values) => {
    const result = await grantPointsBatch(
      selectedStudents.map((s) => s.id),
      values
    );
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success(`تم منح ${values.points} نقطة لـ ${result.grantedCount ?? 0} طالب`);
    if (result.failed && result.failed.length > 0) {
      toast.error(`تعذر منح النقاط لـ ${result.failed.length} طالب`);
    }
    setSelectedStudents([]);
    setSearch("");
    reset({ reason: "course_registration" });
  });

  return (
    <div className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="relative">
          <label className="mb-1 block text-sm font-medium text-brand-text">الطلاب</label>
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-3" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
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
                    onClick={() => addStudent(s)}
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
        </div>

        {selectedStudents.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-brand-text">تم تحديد {selectedStudents.length} طالب</p>
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map((s) => (
                <span
                  key={s.id}
                  className="flex items-center gap-1.5 rounded-full bg-brand-green-light px-3 py-1 text-sm text-brand-text"
                >
                  {s.full_name}
                  <button
                    type="button"
                    onClick={() => removeStudent(s.id)}
                    className="text-brand-text-2 hover:text-brand-orange"
                    aria-label={`إزالة ${s.full_name}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
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

        <SubmitButton disabled={isSubmitting || selectedStudents.length === 0}>
          {isSubmitting ? "جاري المنح..." : "منح النقاط للمجموعة"}
        </SubmitButton>
      </form>
    </div>
  );
}
