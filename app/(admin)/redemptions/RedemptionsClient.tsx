"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageCheck, Check, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/SkeletonRows";
import { BranchBadge } from "@/components/shared/BranchBadge";
import { StudentCode } from "@/components/students/StudentCode";
import { RejectDialog } from "@/components/redemptions/RejectDialog";
import { useToast } from "@/components/providers/toast-provider";
import { useReadOnly } from "@/hooks/useReadOnly";
import { getRedemptions, approveRedemption, rejectRedemption } from "./actions";
import type { Branch, RedemptionQueueRow } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تم التسليم",
  rejected: "مرفوض",
};

const inputClass =
  "rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus:border-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40";

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-brand-green-light px-2 py-1 text-xs font-medium text-brand-green-dark">
        {STATUS_LABELS.approved}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        {STATUS_LABELS.rejected}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-orange-light px-2 py-1 text-xs font-medium text-brand-orange">
      {STATUS_LABELS.pending}
    </span>
  );
}

interface RedemptionsClientProps {
  branches: Branch[];
  isStaff: boolean;
  staffBranchId: number | null;
  staffBranchName: string | null;
}

export function RedemptionsClient({ branches, isStaff, staffBranchId, staffBranchName }: RedemptionsClientProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { canEdit } = useReadOnly();
  const [status, setStatus] = useState("pending");
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<RedemptionQueueRow | null>(null);
  const [actingOnId, setActingOnId] = useState<number | null>(null);

  const branchId = isStaff ? staffBranchId : selectedBranchId;
  const filters = { status: status || null, branchId, search };

  const { data, isLoading } = useQuery({
    queryKey: ["redemptions", filters, page],
    queryFn: () => getRedemptions({ ...filters, page }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["redemptions"] });
    queryClient.invalidateQueries({ queryKey: ["pending-redemptions-count"] });
  }

  async function handleApprove(row: RedemptionQueueRow) {
    setActingOnId(row.id);
    const result = await approveRedemption(row.id);
    setActingOnId(null);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تأكيد استلام المكافأة");
    invalidate();
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    const result = await rejectRedemption(rejectTarget.id, reason);
    if (!result.success) {
      throw new Error(result.error ?? "حدث خطأ ما");
    }
    toast.success("تم رفض الطلب وإرجاع النقاط");
    setRejectTarget(null);
    invalidate();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-text">طلبات الاستبدال</h1>
        {isStaff && staffBranchName && <BranchBadge branchName={staffBranchName} />}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="pending">قيد المراجعة</option>
          <option value="approved">تم التسليم</option>
          <option value="rejected">مرفوض</option>
          <option value="">كل الحالات</option>
        </select>

        {!isStaff && (
          <select
            value={selectedBranchId ?? ""}
            onChange={(e) => {
              setSelectedBranchId(e.target.value ? Number(e.target.value) : null);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name_ar}
              </option>
            ))}
          </select>
        )}

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="بحث بالطالب أو الكود"
          className={inputClass}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <SkeletonRows count={5} />
          </div>
        ) : data && data.rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">الطالب</th>
                <th className="px-4 py-3 font-medium">الكود</th>
                <th className="px-4 py-3 font-medium">الفرع</th>
                <th className="px-4 py-3 font-medium">المكافأة</th>
                <th className="px-4 py-3 font-medium">النقاط</th>
                <th className="px-4 py-3 font-medium">تاريخ الطلب</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{r.student_name}</td>
                  <td className="px-4 py-3">
                    <StudentCode code={r.student_code} />
                  </td>
                  <td className="px-4 py-3 text-brand-text-2">{r.branch_name_ar}</td>
                  <td className="px-4 py-3 text-brand-text-2">{r.reward_name_ar}</td>
                  <td className="px-4 py-3 font-semibold text-brand-orange">{r.points_required}</td>
                  <td className="px-4 py-3 text-brand-text-2">{new Date(r.redeemed_at).toLocaleString("ar")}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    {canEdit && r.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(r)}
                          disabled={actingOnId === r.id}
                          className="flex items-center gap-1 rounded-lg bg-brand-green px-2.5 py-1 text-xs font-semibold text-brand-dark transition hover:bg-brand-green-dark disabled:opacity-60"
                        >
                          <Check size={13} /> تأكيد الاستلام
                        </button>
                        <button
                          onClick={() => setRejectTarget(r)}
                          disabled={actingOnId === r.id}
                          className="flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3 disabled:opacity-60"
                        >
                          <X size={13} /> رفض
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={PackageCheck} message="لا يوجد طلبات مطابقة" />
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

      {rejectTarget && (
        <RejectDialog redemption={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={handleRejectConfirm} />
      )}
    </div>
  );
}
