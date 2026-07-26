"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { useReadOnly } from "@/hooks/useReadOnly";
import { getBranchesWithStats } from "./actions";
import { AddBranchModal } from "@/components/branches/AddBranchModal";
import { DeleteBranchModal } from "@/components/branches/DeleteBranchModal";
import type { BranchLimitInfo, BranchWithStats } from "@/types";
import type { SessionRole } from "@/lib/auth/session";

export function BranchesClient({ initialData, role }: { initialData: BranchLimitInfo; role: SessionRole }) {
  const { canEdit } = useReadOnly();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BranchWithStats | null>(null);

  const { data } = useQuery({
    queryKey: ["branches-with-stats"],
    queryFn: () => getBranchesWithStats(),
    initialData,
  });

  const canManage = canEdit && role === "admin";
  const branches = data?.branches ?? [];
  const used = data?.used ?? 0;
  const max = data?.max ?? 0;
  const atLimit = max !== -1 && used >= max;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">الفروع</h1>
          <p className="mt-1 text-sm text-brand-text-2">
            {used} / {max === -1 ? "غير محدود" : max} فرع مستخدم
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setAddOpen(true)}
            disabled={atLimit}
            title={atLimit ? "تم الوصول للحد الأقصى لعدد الفروع" : undefined}
          >
            <Plus size={16} /> إضافة فرع
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {branches.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">اسم الفرع</th>
                <th className="px-4 py-3 font-medium">عدد الطلاب</th>
                {canManage && <th className="px-4 py-3 font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{b.name_ar}</td>
                  <td className="px-4 py-3 text-brand-text-2">{b.student_count}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(b)}
                        className="text-brand-orange hover:underline"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Building2} message="لا توجد فروع بعد" />
        )}
      </div>

      {addOpen && <AddBranchModal onClose={() => setAddOpen(false)} />}
      {deleteTarget && <DeleteBranchModal branch={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
}
