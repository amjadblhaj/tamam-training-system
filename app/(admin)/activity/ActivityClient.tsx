"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Download } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonRows } from "@/components/shared/SkeletonRows";
import { getActivityLog, getActivityLogForExport } from "./actions";
import type { Branch } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  grant: "منح",
  redeem: "استبدال",
  excel: "استيراد إكسل",
  manual: "يدوي",
  adjustment: "تعديل",
};

const inputClass =
  "rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus:border-brand-green focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40";

export function ActivityClient({ branches, isAdmin }: { branches: Branch[]; isAdmin: boolean }) {
  const [branchId, setBranchId] = useState<number | null>(null);
  const [type, setType] = useState<string>("");
  const [staffUsername, setStaffUsername] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const filters = { branchId, type: type || null, staffUsername, dateFrom, dateTo };

  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", filters, page],
    queryFn: () => getActivityLog({ ...filters, page }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await getActivityLogForExport(filters);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          الطالب: r.student_name,
          الفرع: r.branch_name_ar,
          الإجراء: r.action,
          النقاط: r.points,
          "التاريخ والوقت": new Date(r.created_at).toLocaleString("ar"),
          الموظف: r.granted_by,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, "Activity");
      XLSX.writeFile(wb, "سجل_النشاط.xlsx");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-text">سجل النشاط</h1>
        {isAdmin && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3 disabled:opacity-60"
          >
            <Download size={16} /> {exporting ? "جاري التصدير..." : "تصدير إلى إكسل"}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={branchId ?? ""}
          onChange={(e) => {
            setBranchId(e.target.value ? Number(e.target.value) : null);
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

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        >
          <option value="">كل الأنواع</option>
          <option value="grant">منح</option>
          <option value="redeem">استبدال</option>
          <option value="excel">استيراد إكسل</option>
        </select>

        <input
          value={staffUsername}
          onChange={(e) => {
            setStaffUsername(e.target.value);
            setPage(1);
          }}
          placeholder="اسم الموظف"
          className={inputClass}
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className={inputClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
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
                <th className="px-4 py-3 font-medium">الفرع</th>
                <th className="px-4 py-3 font-medium">الإجراء</th>
                <th className="px-4 py-3 font-medium">النقاط</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الموظف</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{r.student_name}</td>
                  <td className="px-4 py-3 text-brand-text-2">{r.branch_name_ar}</td>
                  <td className="px-4 py-3 text-brand-text-2">
                    {TYPE_LABELS[r.type] ?? r.type} — {r.action}
                  </td>
                  <td
                    className={`px-4 py-3 font-semibold ${r.points >= 0 ? "text-brand-green" : "text-brand-orange"}`}
                  >
                    {r.points >= 0 ? `+${r.points}` : r.points}
                  </td>
                  <td className="px-4 py-3 text-brand-text-2">
                    {new Date(r.created_at).toLocaleString("ar")}
                  </td>
                  <td className="px-4 py-3 text-brand-text-2">{r.granted_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={ClipboardList} message="لا يوجد نشاط مطابق" />
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
    </div>
  );
}
