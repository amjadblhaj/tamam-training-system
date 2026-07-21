"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortalBalance, getPortalRewards, getPortalTransactions, redeemReward } from "./actions";
import { logout } from "@/app/login/actions";
import type { PortalReward, PortalTransaction } from "@/types";

interface PortalClientProps {
  studentName: string;
  initialBalance: number;
  initialRewards: PortalReward[];
  initialTransactions: PortalTransaction[];
}

export function PortalClient({
  studentName,
  initialBalance,
  initialRewards,
  initialTransactions,
}: PortalClientProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: balance = initialBalance } = useQuery({
    queryKey: ["portal-balance"],
    queryFn: () => getPortalBalance(),
    initialData: initialBalance,
  });

  const { data: rewards = initialRewards } = useQuery({
    queryKey: ["portal-rewards"],
    queryFn: () => getPortalRewards(),
    initialData: initialRewards,
  });

  const { data: transactions = initialTransactions } = useQuery({
    queryKey: ["portal-transactions"],
    queryFn: () => getPortalTransactions(),
    initialData: initialTransactions,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (rewardId: number) => redeemReward(rewardId),
    onSuccess: (result, rewardId) => {
      if (!result.success) {
        setMessage({ type: "error", text: result.error ?? "حدث خطأ ما" });
        return;
      }
      const reward = rewards.find((r) => r.id === rewardId);
      setMessage({
        type: "success",
        text: `تم استبدال "${reward?.name_ar ?? ""}" بنجاح. رصيدك الجديد: ${result.newBalance}`,
      });
      queryClient.invalidateQueries({ queryKey: ["portal-balance"] });
      queryClient.invalidateQueries({ queryKey: ["portal-transactions"] });
    },
  });

  function handleRedeem(reward: PortalReward) {
    setMessage(null);
    if (!confirm(`هل تريد استبدال "${reward.name_ar}" مقابل ${reward.points_required} نقطة؟`)) return;
    mutate(reward.id);
  }

  const nextReward = rewards.find((r) => r.points_required > balance);
  const progressPercent = nextReward ? Math.min(100, Math.round((balance / nextReward.points_required) * 100)) : 100;

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-green">تمام</h1>
            <p className="text-sm text-brand-surface-2">مرحبًا، {studentName}</p>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-brand-surface-2 underline">
              تسجيل الخروج
            </button>
          </form>
        </div>

        <div className="mb-6 rounded-2xl bg-brand-dark-2 p-6 text-center">
          <p className="mb-2 text-sm text-brand-surface-2">رصيدك الحالي</p>
          <p className="text-5xl font-extrabold text-brand-orange">{balance}</p>
          <p className="mt-1 text-sm text-brand-surface-2">نقطة</p>
        </div>

        <div className="mb-8">
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-brand-dark-2">
            <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-center text-sm text-brand-surface-2">
            {nextReward
              ? `${nextReward.points_required - balance} نقطة متبقية للحصول على ${nextReward.name_ar}`
              : "كل المكافآت متاحة!"}
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-lg p-3 text-sm ${
              message.type === "success" ? "bg-brand-green-light text-brand-green" : "bg-brand-orange-light text-brand-orange"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mb-8">
          <h2 className="mb-3 font-semibold text-brand-surface">المكافآت</h2>
          <div className="space-y-3">
            {rewards.length > 0 ? (
              rewards.map((r) => {
                const canRedeem = balance >= r.points_required;
                return (
                  <div key={r.id} className="rounded-xl bg-brand-dark-2 p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-semibold text-brand-surface">{r.name_ar}</p>
                      <p className="text-sm text-brand-orange">{r.points_required} نقطة</p>
                    </div>
                    {r.description && <p className="mb-3 text-xs text-brand-surface-2">{r.description}</p>}
                    <button
                      onClick={() => handleRedeem(r)}
                      disabled={!canRedeem || isPending}
                      className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
                        canRedeem
                          ? "bg-brand-green text-brand-dark hover:bg-brand-green-dark"
                          : "cursor-not-allowed bg-brand-dark text-brand-surface-2"
                      }`}
                    >
                      {canRedeem ? "استبدال" : `يلزم ${r.points_required - balance} نقطة إضافية`}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-brand-surface-2">لا توجد مكافآت متاحة حاليًا</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-brand-surface">سجل الحركات</h2>
          {transactions.length > 0 ? (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-brand-dark-2 px-3 py-2 text-sm">
                  <span className="text-brand-surface-2">{t.action}</span>
                  <span className={t.points >= 0 ? "font-semibold text-brand-green" : "font-semibold text-brand-orange"}>
                    {t.points >= 0 ? `+${t.points}` : t.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-surface-2">لا يوجد سجل حركات بعد</p>
          )}
        </div>
      </div>
    </main>
  );
}
