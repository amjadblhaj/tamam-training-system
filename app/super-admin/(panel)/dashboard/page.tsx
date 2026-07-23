import Link from "next/link";
import { Building2, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { TenantStatusBadge } from "@/components/super-admin/TenantStatusBadge";
import { getDashboardStats, getTenants } from "@/lib/actions/super-admin-tenants";

export default async function SuperAdminDashboardPage() {
  const [stats, tenants] = await Promise.all([getDashboardStats(), getTenants()]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-text">لوحة التحكم</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="إجمالي العملاء" value={stats.totalTenants} icon={Building2} />
        <MetricCard label="العملاء النشطون" value={stats.activeTenants} icon={CheckCircle2} />
        <MetricCard label="فترة تجريبية" value={stats.trialTenants} icon={Clock} accent="orange" />
        <MetricCard label="يحتاج إجراء" value={stats.suspendedOrExpiredTenants} icon={AlertTriangle} accent="orange" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-right text-brand-text-2">
              <th className="px-4 py-3 font-medium">الأكاديمية</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium">الطلاب</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-3 text-brand-text">{t.academy_name}</td>
                <td className="px-4 py-3">
                  <TenantStatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-brand-text-2">{t.students_count}</td>
                <td className="px-4 py-3">
                  <Link href={`/super-admin/tenants/${t.id}`} className="text-brand-orange hover:underline">
                    عرض
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
