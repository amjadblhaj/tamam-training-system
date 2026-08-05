"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Users as UsersIcon, Plus, Trash2 } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStudents } from "@/hooks/useStudents";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/SkeletonRows";
import { BranchBadge } from "@/components/shared/BranchBadge";
import { BulkActionBar } from "@/components/shared/BulkActionBar";
import { StudentCode } from "@/components/students/StudentCode";
import { Button } from "@/components/ui/Button";
import { AddStudentModal } from "@/components/students/AddStudentModal";
import { PasswordConfirmModal } from "@/components/transactions/PasswordConfirmModal";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import { deleteStudents } from "./actions";
import type { Branch, StudentRow, DeleteStudentsResponse } from "@/types";

interface StudentsClientProps {
  branches: Branch[];
  isAdmin: boolean;
  isStaff: boolean;
  staffBranchId: number | null;
  staffBranchName: string | null;
}

export function StudentsClient({ branches, isAdmin, isStaff, staffBranchId, staffBranchName }: StudentsClientProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const effectiveBranchId = isStaff ? staffBranchId : branchId;
  const { data, isLoading } = useStudents({ search: debouncedSearch, branchId: effectiveBranchId, page });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const deletableIds = isAdmin && canEdit ? (data?.students ?? []).map((s) => s.id) : [];
  const bulkSelection = useBulkSelection(deletableIds);

  useEffect(() => {
    bulkSelection.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear on page/filter change only
  }, [page, effectiveBranchId, debouncedSearch]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["students"] });
  }

  function handleDeleteSuccess(result: DeleteStudentsResponse) {
    setDeleteTarget(null);
    setBulkDeleteOpen(false);
    bulkSelection.clear();
    toast.success(`تم حذف ${result.deleted?.length ?? 0} طالب`);
    invalidate();
  }

  const selectedStudents = (data?.students ?? []).filter((s) => bulkSelection.selected.has(s.id));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-text">الطلاب</h1>
          {isStaff && staffBranchName && <BranchBadge branchName={staffBranchName} />}
        </div>
        {canEdit && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> إضافة طالب
          </Button>
        )}
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
            placeholder="بحث بالاسم أو رقم الهاتف أو الكود"
            className="w-full rounded-lg border border-brand-border py-2 pr-9 pl-3 text-sm text-brand-text focus:border-brand-green focus:outline-none"
          />
        </div>
        {!isStaff && (
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
        )}
      </div>

      {isAdmin && (
        <BulkActionBar
          count={bulkSelection.count}
          itemLabel="طالب"
          actionLabel="حذف المحدد"
          icon={Trash2}
          onActionClick={() => setBulkDeleteOpen(true)}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <SkeletonRows count={5} />
          </div>
        ) : data && data.students.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                {isAdmin && (
                  <th className="w-8 px-4 py-3">
                    {deletableIds.length > 0 && (
                      <input
                        type="checkbox"
                        checked={bulkSelection.allSelected}
                        onChange={bulkSelection.toggleAll}
                      />
                    )}
                  </th>
                )}
                <th className="px-4 py-3 font-medium">الكود</th>
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
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {canEdit && (
                        <input
                          type="checkbox"
                          checked={bulkSelection.selected.has(s.id)}
                          onChange={() => bulkSelection.toggle(s.id)}
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <StudentCode code={s.student_code} />
                  </td>
                  <td className="px-4 py-3 text-brand-text">{s.full_name}</td>
                  <td className="px-4 py-3 text-brand-text-2">{s.phone}</td>
                  <td className="px-4 py-3 text-brand-text-2">{s.branch_name_ar}</td>
                  <td className="px-4 py-3 font-semibold text-brand-orange">{s.points}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/students/${s.id}`} className="text-brand-green hover:underline">
                        عرض
                      </Link>
                      {isAdmin && canEdit && (
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="text-brand-text-3 transition-colors hover:text-brand-orange"
                          aria-label={`حذف ${s.full_name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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

      {modalOpen && (
        <AddStudentModal
          branches={branches}
          isStaff={isStaff}
          staffBranchId={staffBranchId}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deleteTarget && (
        <PasswordConfirmModal
          title="حذف الطالب"
          onClose={() => setDeleteTarget(null)}
          onConfirm={(password) => deleteStudents([deleteTarget.id], password)}
          onSuccess={handleDeleteSuccess}
          confirmLabel="تأكيد الحذف"
          confirmingLabel="جاري الحذف..."
        >
          <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-brand-text">
              {deleteTarget.full_name}
              <StudentCode code={deleteTarget.student_code} />
            </p>
          </div>
          <div className="rounded-lg border border-brand-orange bg-brand-orange-light px-3 py-2 text-sm text-brand-text">
            سيتم حذف الطلاب من القائمة (يبقى سجلهم محفوظاً للأرشيف)
          </div>
        </PasswordConfirmModal>
      )}

      {bulkDeleteOpen && (
        <PasswordConfirmModal
          title="حذف الطلاب"
          onClose={() => setBulkDeleteOpen(false)}
          onConfirm={(password) => deleteStudents(Array.from(bulkSelection.selected), password)}
          onSuccess={handleDeleteSuccess}
          confirmLabel="تأكيد الحذف"
          confirmingLabel="جاري الحذف..."
        >
          <div className="rounded-lg border border-brand-border bg-brand-surface-2 p-3 text-sm">
            <p className="mb-1 font-semibold text-brand-text">سيتم حذف {selectedStudents.length} طالب</p>
            <p className="text-brand-text-2">{selectedStudents.map((s) => s.full_name).join("، ")}</p>
          </div>
          <div className="rounded-lg border border-brand-orange bg-brand-orange-light px-3 py-2 text-sm text-brand-text">
            سيتم حذف الطلاب من القائمة (يبقى سجلهم محفوظاً للأرشيف)
          </div>
        </PasswordConfirmModal>
      )}
    </div>
  );
}
