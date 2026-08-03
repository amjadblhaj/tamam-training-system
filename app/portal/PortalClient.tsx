"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPortalBalance, getPortalRewards, getPortalTransactions, redeemReward } from "./actions";
import { logout } from "@/app/login/actions";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import { ConfettiBurst } from "@/components/portal/ConfettiBurst";
import { StudentCode } from "@/components/students/StudentCode";
import type { PortalReward, PortalTransaction, TenantStatusInfo } from "@/types";

interface PortalClientProps {
  studentName: string;
  studentCode: string | null;
  initialBalance: number;
  initialRewards: PortalReward[];
  initialTransactions: PortalTransaction[];
  initialTenantStatus: TenantStatusInfo | null;
}

export function PortalClient({
  studentName,
  studentCode,
  initialBalance,
  initialRewards,
  initialTransactions,
  initialTenantStatus,
}: PortalClientProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const seeded = useRef(false);
  if (!seeded.current) {
    queryClient.setQueryData(["tenant-status"], initialTenantStatus);
    seeded.current = true;
  }
  const { canEdit } = useReadOnly();
  const [celebrating, setCelebrating] = useState(false);

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
        toast.error(result.error ?? "حدث خطأ ما");
        return;
      }
      const reward = rewards.find((r) => r.id === rewardId);
      toast.success(`تم استبدال "${reward?.name_ar ?? ""}" بنجاح. رصيدك الجديد: ${result.newBalance}`);
      setCelebrating(true);
      queryClient.invalidateQueries({ queryKey: ["portal-balance"] });
      queryClient.invalidateQueries({ queryKey: ["portal-transactions"] });
    },
  });

  function handleRedeem(reward: PortalReward) {
    if (!confirm(`هل تريد استبدال "${reward.name_ar}" مقابل ${reward.points_required} نقطة؟`)) return;
    mutate(reward.id);
  }

  const nextReward = rewards.find((r) => r.points_required > balance);
  const progressPercent = nextReward
    ? Math.min(100, Math.round((balance / nextReward.points_required) * 100))
    : 100;

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Image src="/logo-mark.png" alt="تمام" width={90} height={33} className="h-auto w-[90px]" priority />
            <p className="mt-1 text-sm text-brand-surface-2">مرحبًا، {studentName}</p>
            {studentCode && (
              <div className="mt-1">
                <StudentCode code={studentCode} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/portal/leaderboard" className="flex items-center gap-1 text-sm text-brand-orange">
              <Trophy size={16} />
              المتصدرين
            </Link>
            <form action={logout}>
              <button type="submit" className="text-sm text-brand-surface-2 underline">
                تسجيل الخروج
              </button>
            </form>
          </div>
        </div>

        <div className="relative mb-6 rounded-2xl bg-brand-dark-2 p-6 text-center">
          <p className="mb-2 text-sm text-brand-surface-2">رصيدك الحالي</p>
          <p
            className={`text-5xl font-extrabold text-brand-orange ${celebrating ? "animate-in zoom-in-125 duration-500" : ""}`}
          >
            {balance}
          </p>
          <p className="mt-1 text-sm text-brand-surface-2">نقطة</p>
          {celebrating && <ConfettiBurst onDone={() => setCelebrating(false)} />}
        </div>

        <div className="mb-8">
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-brand-dark-2">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-center text-sm text-brand-surface-2">
            {nextReward
              ? `${nextReward.points_required - balance} نقطة متبقية للحصول على ${nextReward.name_ar}`
              : "كل المكافآت متاحة!"}
          </p>
        </div>

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
                    {!canEdit ? (
                      <div className="w-full rounded-lg bg-brand-dark py-2 text-center text-sm font-semibold text-brand-surface-2">
                        الاستبدال موقوف مؤقتاً
                      </div>
                    ) : (
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
                    )}
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
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-brand-dark-2 px-3 py-2 text-sm"
                >
                  <span className="text-brand-surface-2">{t.action}</span>
                  <span
                    className={
                      t.points >= 0 ? "font-semibold text-brand-green" : "font-semibold text-brand-orange"
                    }
                  >
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
