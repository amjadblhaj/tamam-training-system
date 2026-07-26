"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/SkeletonRows";
import { Button } from "@/components/ui/Button";
import { RewardModal } from "@/components/rewards/RewardModal";
import { getRewards, toggleRewardActive, deleteReward } from "./actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import type { Reward } from "@/types";

export function RewardsClient() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const { data: rewards, isLoading } = useQuery({ queryKey: ["rewards"], queryFn: () => getRewards() });

  async function handleToggle(reward: Reward) {
    const result = await toggleRewardActive(reward.id, !reward.active);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
    toast.info(reward.active ? "تم إلغاء تفعيل المكافأة" : "تم تفعيل المكافأة");
  }

  async function handleDelete(reward: Reward) {
    if (!confirm(`هل أنت متأكد من حذف مكافأة "${reward.name_ar}"؟`)) return;
    const result = await deleteReward(reward.id);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
    toast.success("تم حذف المكافأة");
  }

  function openAddModal() {
    setEditingReward(null);
    setModalOpen(true);
  }

  function openEditModal(reward: Reward) {
    setEditingReward(reward);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">المكافآت</h1>
        {canEdit && (
          <Button onClick={openAddModal}>
            <Plus size={16} /> إضافة مكافأة
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <SkeletonRows count={3} />
          </div>
        ) : rewards && rewards.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">الاسم</th>
                <th className="px-4 py-3 font-medium">النقاط المطلوبة</th>
                <th className="px-4 py-3 font-medium">الوصف</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">الاستبدالات</th>
                {canEdit && <th className="px-4 py-3 font-medium">إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{r.name_ar}</td>
                  <td className="px-4 py-3 font-semibold text-brand-orange">{r.points_required}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-brand-text-2">{r.description}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(r)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          r.active
                            ? "bg-brand-green-light text-brand-green"
                            : "bg-brand-surface-3 text-brand-text-3"
                        }`}
                      >
                        {r.active ? "مفعّلة" : "غير مفعّلة"}
                      </button>
                    ) : (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          r.active
                            ? "bg-brand-green-light text-brand-green"
                            : "bg-brand-surface-3 text-brand-text-3"
                        }`}
                      >
                        {r.active ? "مفعّلة" : "غير مفعّلة"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-text-2">{r.redeemed_count}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditModal(r)} className="text-brand-green hover:underline">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(r)} className="text-brand-orange hover:underline">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Award} message="لا توجد مكافآت بعد" />
        )}
      </div>

      {modalOpen && <RewardModal reward={editingReward} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
