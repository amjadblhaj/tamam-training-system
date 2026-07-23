"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { TenantStatusBadge } from "@/components/super-admin/TenantStatusBadge";
import { getDaysRemaining } from "@/lib/tenant/access";
import type { TenantRow } from "@/types";

function DaysRemainingCell({ tenant }: { tenant: TenantRow }) {
  const days = getDaysRemaining(tenant);
  if (days === null) return <span className="text-brand-text-3">—</span>;
  if (days <= 0) return <span className="font-semibold text-brand-orange">منتهٍ</span>;
  return (
    <span className={days <= 7 ? "font-semibold text-brand-orange" : "text-brand-text-2"}>
      {days} {days === 1 ? "يوم" : "أيام"}
    </span>
  );
}

export function TenantsClient({ initialTenants }: { initialTenants: TenantRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = initialTenants.filter(
    (t) =>
      t.academy_name.includes(search) ||
      t.owner_email.toLowerCase().includes(search.toLowerCase()) ||
      t.owner_name.includes(search)
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-text">العملاء</h1>
        <Link
          href="/super-admin/tenants/new"
          className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          <Plus size={16} /> إضافة عميل
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو البريد الإلكتروني"
          className="w-full rounded-lg border border-brand-border py-2 pr-9 pl-3 text-sm text-brand-text focus:border-brand-orange focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border bg-brand-surface">
        {filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-right text-brand-text-2">
                <th className="px-4 py-3 font-medium">الأكاديمية</th>
                <th className="px-4 py-3 font-medium">المالك</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">الأيام المتبقية</th>
                <th className="px-4 py-3 font-medium">الطلاب</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-3 text-brand-text">{t.academy_name}</td>
                  <td className="px-4 py-3 text-brand-text-2">{t.owner_email}</td>
                  <td className="px-4 py-3">
                    <TenantStatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DaysRemainingCell tenant={t} />
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
        ) : (
          <EmptyState icon={Building2} message="لا يوجد عملاء بعد" />
        )}
      </div>
    </div>
  );
}
