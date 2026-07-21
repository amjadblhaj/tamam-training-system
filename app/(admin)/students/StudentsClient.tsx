"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users as UsersIcon, Plus } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStudents } from "@/hooks/useStudents";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddStudentModal } from "@/components/students/AddStudentModal";
import type { Branch } from "@/types";

export function StudentsClient({ branches }: { branches: Branch[] }) {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useStudents({ search: debouncedSearch, branchId, page });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-text">الطلاب</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          <Plus size={16} /> إضافة طالب
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-3" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم أو رقم الهاتف"
            className="w-full rounded-lg border border-brand-border py-2 pr-9 pl-3 text-sm text-brand-text focus:border-brand-green focus:outline-none"
          />
        </div>
        <select
          value={branchId ?? ""}
          onChange={(e) => {
            setBranchId(e.target.value ? Number(e.target.value) : null);
            setPage(1);
          }}
          className="rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus:border-brand-green focus:outline-none"
        >
          <option value="">كل الفروع</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name_ar}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-brand-surface-3" />
            ))}
          </div>
        ) : data && data.students.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">رقم الهاتف</th>
                <th className="px-4 py-3 font-medium">الفرع</th>
                <th className="px-4 py-3 font-medium">النقاط</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{s.full_name}</td>
                  <td className="px-4 py-3 text-brand-text-2">{s.phone}</td>
                  <td className="px-4 py-3 text-brand-text-2">{s.branch_name_ar}</td>
                  <td className="px-4 py-3 font-semibold text-brand-orange">{s.points}</td>
                  <td className="px-4 py-3">
                    <Link href={`/students/${s.id}`} className="text-brand-green hover:underline">
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={UsersIcon} message="لا يوجد طلاب مطابقون" />
        )}
      </div>

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-text-2 disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-sm text-brand-text-2">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-text-2 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}

      {modalOpen && <AddStudentModal branches={branches} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
