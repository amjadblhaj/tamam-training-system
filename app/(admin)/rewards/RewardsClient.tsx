"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Award } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { RewardModal } from "@/components/rewards/RewardModal";
import { getRewards, toggleRewardActive, deleteReward } from "./actions";
import type { Reward } from "@/types";

export function RewardsClient() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  const { data: rewards, isLoading } = useQuery({ queryKey: ["rewards"], queryFn: () => getRewards() });

  async function handleToggle(reward: Reward) {
    await toggleRewardActive(reward.id, !reward.active);
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
  }

  async function handleDelete(reward: Reward) {
    if (!confirm(`هل أنت متأكد من حذف مكافأة "${reward.name_ar}"؟`)) return;
    await deleteReward(reward.id);
    queryClient.invalidateQueries({ queryKey: ["rewards"] });
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
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          <Plus size={16} /> إضافة مكافأة
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-brand-surface-3" />
            ))}
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
                <th className="px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{r.name_ar}</td>
                  <td className="px-4 py-3 font-semibold text-brand-orange">{r.points_required}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-brand-text-2">{r.description}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        r.active ? "bg-brand-green-light text-brand-green" : "bg-brand-surface-3 text-brand-text-3"
                      }`}
                    >
                      {r.active ? "مفعّلة" : "غير مفعّلة"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-brand-text-2">{r.redeemed_count}</td>
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
