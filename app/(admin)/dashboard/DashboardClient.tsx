"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Gift, Award, Building2, TrendingUp, Activity } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/SkeletonRows";
import { BranchBadge } from "@/components/shared/BranchBadge";
import { MedalRow, MedalCrown } from "@/components/leaderboard/MedalRow";
import { getDashboardMetrics, getTopStudents, getRecentActivity } from "./actions";
import type { Branch } from "@/types";

const REFRESH_MS = 30_000;

interface DashboardClientProps {
  branches: Branch[];
  isStaff: boolean;
  staffBranchId: number | null;
  staffBranchName: string | null;
}

export function DashboardClient({ branches, isStaff, staffBranchId, staffBranchName }: DashboardClientProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const branchId = isStaff ? staffBranchId : selectedBranchId;

  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics", branchId],
    queryFn: () => getDashboardMetrics(branchId),
    refetchInterval: REFRESH_MS,
  });

  const topStudentsQuery = useQuery({
    queryKey: ["dashboard-top-students", branchId],
    queryFn: () => getTopStudents(branchId),
    refetchInterval: REFRESH_MS,
  });

  const activityQuery = useQuery({
    queryKey: ["dashboard-activity", branchId],
    queryFn: () => getRecentActivity(branchId),
    refetchInterval: REFRESH_MS,
  });

  const metrics = metricsQuery.data;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-text">لوحة التحكم</h1>
            {isStaff && staffBranchName && <BranchBadge branchName={staffBranchName} />}
          </div>
          <p className="mt-1 text-sm text-brand-text-2">نظرة عامة على النشاط عبر الفروع</p>
        </div>
        {!isStaff && (
          <select
            value={selectedBranchId ?? ""}
            onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:border-brand-green focus:outline-none"
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="إجمالي الطلاب" value={metrics?.totalStudents ?? "—"} icon={Users} />
        <MetricCard
          label="إجمالي النقاط الممنوحة"
          value={metrics?.totalPointsGranted ?? "—"}
          icon={TrendingUp}
          accent="orange"
        />
        <MetricCard label="المكافآت المستبدلة" value={metrics?.rewardsRedeemed ?? "—"} icon={Gift} />
        <MetricCard
          label="الفروع النشطة"
          value={metrics?.activeBranches ?? "—"}
          icon={Building2}
          accent="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 font-semibold text-brand-text">أفضل 10 طلاب</h2>
          {topStudentsQuery.isLoading ? (
            <div className="space-y-3"><SkeletonRows count={3} height="h-5" /></div>
          ) : topStudentsQuery.data && topStudentsQuery.data.length > 0 ? (
            <ul className="space-y-2">
              {topStudentsQuery.data.map((s, i) => (
                <li key={s.id}>
                  <MedalRow rank={i + 1} fallbackClassName="border border-transparent">
                    <div className="flex items-center gap-2 px-3 py-2 text-sm">
                      <MedalCrown rank={i + 1} size={16} />
                      <span className="flex-1 text-brand-text">
                        {i + 1}. {s.full_name} <span className="text-brand-text-3">({s.branch_name_ar})</span>
                      </span>
                      <span className="font-semibold text-brand-orange">{s.points}</span>
                    </div>
                  </MedalRow>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Award} message="لا يوجد طلاب بعد" />
          )}
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 font-semibold text-brand-text">آخر النشاطات</h2>
          {activityQuery.isLoading ? (
            <div className="space-y-3"><SkeletonRows count={3} height="h-5" /></div>
          ) : activityQuery.data && activityQuery.data.length > 0 ? (
            <ul className="space-y-3">
              {activityQuery.data.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-brand-text">
                    {a.student_name} — {a.action}
                  </span>
                  <span
                    className={
                      a.points >= 0 ? "font-semibold text-brand-green" : "font-semibold text-brand-orange"
                    }
                  >
                    {a.points >= 0 ? `+${a.points}` : a.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Activity} message="لا يوجد نشاط بعد" />
          )}
        </div>
      </div>
    </div>
  );
}
