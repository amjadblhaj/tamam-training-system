"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { TenantStatusBadge } from "@/components/super-admin/TenantStatusBadge";
import { useToast } from "@/components/providers/toast-provider";
import { getDaysRemaining } from "@/lib/tenant/access";
import { suspendTenantAccount } from "@/lib/actions/super-admin-tenants";
import { ActivateModal } from "@/components/super-admin/modals/ActivateModal";
import { ReactivateModal } from "@/components/super-admin/modals/ReactivateModal";
import { AddonModal } from "@/components/super-admin/modals/AddonModal";
import { ExtendTrialModal } from "@/components/super-admin/modals/ExtendTrialModal";
import { MaxBranchesModal } from "@/components/super-admin/modals/MaxBranchesModal";
import { ResetPasswordModal } from "@/components/super-admin/modals/ResetPasswordModal";
import { DeleteTenantModal } from "@/components/super-admin/modals/DeleteTenantModal";
import type { TenantDetail } from "@/types";

type ActiveModal = "activate" | "reactivate" | "addon" | "extend" | "maxBranches" | "delete" | null;

export function TenantDetailClient({ tenant }: { tenant: TenantDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string; username: string } | null>(
    null
  );
  const [suspending, setSuspending] = useState(false);

  function refresh() {
    setActiveModal(null);
    setResetPasswordTarget(null);
    router.refresh();
  }

  async function handleSuspend() {
    if (!confirm(`هل تريد تعليق حساب "${tenant.academy_name}"؟ سيتحول العميل لوضع القراءة فقط فورًا.`))
      return;
    setSuspending(true);
    const result = await suspendTenantAccount(tenant.id);
    setSuspending(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تعليق الحساب");
    router.refresh();
  }

  const daysLeft = getDaysRemaining(tenant);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">{tenant.academy_name}</h1>
        {tenant.academy_name_en && <p className="text-sm text-brand-text-2">{tenant.academy_name_en}</p>}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-3 font-semibold text-brand-text">معلومات العميل</h2>
          <div className="space-y-1.5 text-sm text-brand-text-2">
            <p>
              المالك: <span className="text-brand-text">{tenant.owner_name}</span>
            </p>
            <p>
              البريد الإلكتروني: <span className="text-brand-text">{tenant.owner_email}</span>
            </p>
            {tenant.owner_phone && (
              <p>
                الهاتف: <span className="text-brand-text">{tenant.owner_phone}</span>
              </p>
            )}
            <p>
              تاريخ الإنشاء:{" "}
              <span className="text-brand-text">{new Date(tenant.created_at).toLocaleDateString("ar")}</span>
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-text">الحالة الحالية</h2>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <div className="space-y-1.5 text-sm text-brand-text-2">
            <p>
              الفروع:{" "}
              <span className="text-brand-text">
                {tenant.branches_used} /{" "}
                {tenant.total_branches_allowed === -1 ? "غير محدود" : tenant.total_branches_allowed}
              </span>
            </p>
            <p>
              الطلاب:{" "}
              <span className="text-brand-text">
                {tenant.students_count} / {tenant.max_students === -1 ? "غير محدود" : tenant.max_students}
              </span>
            </p>
            {daysLeft !== null && (
              <p className={daysLeft <= 7 ? "font-semibold text-brand-orange" : ""}>
                {tenant.status === "trial" ? "تنتهي التجربة خلال" : "ينتهي الاشتراك خلال"}{" "}
                {daysLeft <= 0 ? "منتهٍ" : `${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="mb-3 font-semibold text-brand-text">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveModal("activate")}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-green-dark"
          >
            تفعيل اشتراك
          </button>
          <button
            onClick={handleSuspend}
            disabled={suspending || tenant.status === "suspended"}
            className="rounded-lg border border-brand-orange px-4 py-2 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange-light disabled:opacity-50"
          >
            تعليق الحساب
          </button>
          <button
            onClick={() => setActiveModal("reactivate")}
            className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            إعادة التفعيل
          </button>
          <button
            onClick={() => setActiveModal("addon")}
            className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            إضافة فرع
          </button>
          {tenant.status === "trial" && (
            <button
              onClick={() => setActiveModal("extend")}
              className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text-2 transition-colors hover:bg-brand-surface-3"
            >
              تمديد التجربة
            </button>
          )}
          <button
            onClick={() => setActiveModal("maxBranches")}
            className="rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text-2 transition-colors hover:bg-brand-surface-3"
          >
            تعديل الحد الأقصى للفروع
          </button>
          <button
            onClick={() => setActiveModal("delete")}
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:opacity-90"
          >
            حذف الحساب
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="mb-3 font-semibold text-brand-text">سجل الاشتراكات</h2>
        {tenant.subscriptions.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {tenant.subscriptions.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-brand-surface-3 px-3 py-2"
              >
                <span className="text-brand-text">
                  {new Date(s.starts_at).toLocaleDateString("ar")} —{" "}
                  {s.ends_at ? new Date(s.ends_at).toLocaleDateString("ar") : "بدون تاريخ انتهاء"}
                </span>
                {s.payment_ref && <span className="text-brand-text-2">{s.payment_ref}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-text-3">لا يوجد سجل اشتراكات بعد</p>
        )}
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="mb-3 font-semibold text-brand-text">حسابات الموظفين</h2>
        {tenant.staff.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {tenant.staff.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-brand-surface-3 px-3 py-2"
              >
                <span className="text-brand-text">{s.username}</span>
                <div className="flex items-center gap-3">
                  <span className="text-brand-text-2">{s.role === "admin" ? "مدير" : "موظف"}</span>
                  <button
                    onClick={() => setResetPasswordTarget({ id: s.id, username: s.username })}
                    className="flex items-center gap-1 text-brand-orange hover:underline"
                    title="تغيير كلمة المرور"
                  >
                    <KeyRound size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-brand-text-3">لا يوجد موظفون بعد</p>
        )}
      </div>

      {activeModal === "activate" && (
        <ActivateModal tenantId={tenant.id} onClose={() => setActiveModal(null)} onDone={refresh} />
      )}
      {activeModal === "reactivate" && (
        <ReactivateModal tenantId={tenant.id} onClose={() => setActiveModal(null)} onDone={refresh} />
      )}
      {activeModal === "addon" && (
        <AddonModal tenantId={tenant.id} onClose={() => setActiveModal(null)} onDone={refresh} />
      )}
      {activeModal === "extend" && (
        <ExtendTrialModal tenantId={tenant.id} onClose={() => setActiveModal(null)} onDone={refresh} />
      )}
      {activeModal === "maxBranches" && (
        <MaxBranchesModal
          tenantId={tenant.id}
          currentMax={tenant.max_branches}
          onClose={() => setActiveModal(null)}
          onDone={refresh}
        />
      )}
      {activeModal === "delete" && (
        <DeleteTenantModal
          tenantId={tenant.id}
          academyName={tenant.academy_name}
          onClose={() => setActiveModal(null)}
          onDeleted={() => router.push("/super-admin/tenants")}
        />
      )}
      {resetPasswordTarget && (
        <ResetPasswordModal
          staffId={resetPasswordTarget.id}
          username={resetPasswordTarget.username}
          onClose={() => setResetPasswordTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
