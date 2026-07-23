"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddStaffModal } from "@/components/settings/AddStaffModal";
import { useToast } from "@/components/providers/toast-provider";
import { getStaffList, toggleStaffActive, deleteStaff } from "./actions";
import { useReadOnly } from "@/hooks/useReadOnly";
import type { Branch, StaffRow } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  staff: "موظف",
};

export function SettingsClient({ branches }: { branches: Branch[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: staff, isLoading } = useQuery({ queryKey: ["staff"], queryFn: () => getStaffList() });

  async function handleToggle(member: StaffRow) {
    const result = await toggleStaffActive(member.id, !member.active);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    toast.info(member.active ? "تم إلغاء تفعيل الموظف" : "تم تفعيل الموظف");
  }

  async function handleDelete(member: StaffRow) {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${member.username}"؟`)) return;
    const result = await deleteStaff(member.id);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    toast.success("تم حذف الموظف");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">الإعدادات</h1>
        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            <Plus size={16} /> إضافة موظف
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-brand-surface-3" />
            ))}
          </div>
        ) : staff && staff.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">اسم المستخدم</th>
                <th className="px-4 py-3 font-medium">الفرع</th>
                <th className="px-4 py-3 font-medium">الصلاحية</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                {canEdit && <th className="px-4 py-3 font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{s.username}</td>
                  <td className="px-4 py-3 text-brand-text-2">{s.branch_name_ar ?? "—"}</td>
                  <td className="px-4 py-3 text-brand-text-2">{ROLE_LABELS[s.role] ?? s.role}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(s)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          s.active ? "bg-brand-green-light text-brand-green" : "bg-brand-surface-3 text-brand-text-3"
                        }`}
                      >
                        {s.active ? "نشط" : "غير نشط"}
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          s.active ? "bg-brand-green-light text-brand-green" : "bg-brand-surface-3 text-brand-text-3"
                        }`}
                      >
                        {s.active ? "نشط" : "غير نشط"}
                      </span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(s)} className="text-brand-orange hover:underline">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Users} message="لا يوجد موظفون بعد" />
        )}
      </div>

      {modalOpen && <AddStaffModal branches={branches} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
