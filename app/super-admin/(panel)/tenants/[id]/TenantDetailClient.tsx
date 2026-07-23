"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { TenantStatusBadge } from "@/components/super-admin/TenantStatusBadge";
import { useToast } from "@/components/providers/toast-provider";
import {
  activateTenantSubscription,
  suspendTenantAccount,
  reactivateTenantAccount,
  addTenantBranchAddon,
  extendTenantTrial,
} from "@/lib/actions/super-admin-tenants";
import type { TenantDetail } from "@/types";

const inputClass =
  "w-full rounded-lg border border-brand-border px-3 py-2 text-brand-text focus:border-brand-orange focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-brand-text">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-brand-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-text">{title}</h2>
          <button onClick={onClose} className="text-brand-text-2 transition-colors hover:text-brand-text">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActivateModal({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [plan, setPlan] = useState("basic");
  const [months, setMonths] = useState(12);
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await activateTenantSubscription(tenantId, { plan, months, paymentRef });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تفعيل الاشتراك بنجاح");
    onDone();
  }

  return (
    <ModalShell title="تفعيل اشتراك" onClose={onClose}>
      <div className="space-y-4">
        <Field label="الخطة">
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass}>
            <option value="basic">أساسية — 300 د.ل</option>
            <option value="standard">متوسطة — 500 د.ل</option>
            <option value="pro">متقدمة — 800 د.ل</option>
          </select>
        </Field>
        <Field label="المدة">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
            <option value={12}>12 شهر</option>
            <option value={6}>6 أشهر</option>
            <option value={3}>3 أشهر</option>
            <option value={1}>شهر واحد</option>
          </select>
        </Field>
        <Field label="مرجع الدفع (اختياري)">
          <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className={inputClass} />
        </Field>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "جاري التفعيل..." : "تأكيد التفعيل"}
        </button>
      </div>
    </ModalShell>
  );
}

function ReactivateModal({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await reactivateTenantAccount(tenantId, months);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم إعادة تفعيل الحساب بنجاح");
    onDone();
  }

  return (
    <ModalShell title="إعادة تفعيل الحساب" onClose={onClose}>
      <div className="space-y-4">
        <Field label="المدة">
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
            <option value={12}>12 شهر</option>
            <option value={6}>6 أشهر</option>
            <option value={3}>3 أشهر</option>
          </select>
        </Field>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "جاري التفعيل..." : "تأكيد إعادة التفعيل"}
        </button>
      </div>
    </ModalShell>
  );
}

function AddonModal({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [branches, setBranches] = useState(1);
  const [amount, setAmount] = useState(50);
  const [paymentRef, setPaymentRef] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await addTenantBranchAddon(tenantId, { branches, amount, paymentRef });
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تمت إضافة الفروع بنجاح");
    onDone();
  }

  return (
    <ModalShell title="إضافة فرع" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عدد الفروع">
          <input
            type="number"
            min={1}
            value={branches}
            onChange={(e) => setBranches(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="المبلغ (د.ل)">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="مرجع الدفع (اختياري)">
          <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className={inputClass} />
        </Field>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "جاري الإضافة..." : "تأكيد الإضافة"}
        </button>
      </div>
    </ModalShell>
  );
}

function ExtendTrialModal({ tenantId, onClose, onDone }: { tenantId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await extendTenantTrial(tenantId, days);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error ?? "حدث خطأ ما");
      return;
    }
    toast.success("تم تمديد الفترة التجريبية");
    onDone();
  }

  return (
    <ModalShell title="تمديد الفترة التجريبية" onClose={onClose}>
      <div className="space-y-4">
        <Field label="عدد الأيام الإضافية">
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full rounded-lg bg-brand-green py-2.5 font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-60"
        >
          {loading ? "جاري التمديد..." : "تأكيد التمديد"}
        </button>
      </div>
    </ModalShell>
  );
}

export function TenantDetailClient({ tenant }: { tenant: TenantDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [activeModal, setActiveModal] = useState<"activate" | "reactivate" | "addon" | "extend" | null>(null);
  const [suspending, setSuspending] = useState(false);

  function refresh() {
    setActiveModal(null);
    router.refresh();
  }

  async function handleSuspend() {
    if (!confirm(`هل تريد تعليق حساب "${tenant.academy_name}"؟ سيتحول العميل لوضع القراءة فقط فورًا.`)) return;
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

  const expiryDate = tenant.status === "trial" ? tenant.trial_ends_at : tenant.subscription_ends_at;
  const daysLeft = expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

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
            <p>المالك: <span className="text-brand-text">{tenant.owner_name}</span></p>
            <p>البريد الإلكتروني: <span className="text-brand-text">{tenant.owner_email}</span></p>
            {tenant.owner_phone && <p>الهاتف: <span className="text-brand-text">{tenant.owner_phone}</span></p>}
            <p>تاريخ الإنشاء: <span className="text-brand-text">{new Date(tenant.created_at).toLocaleDateString("ar")}</span></p>
          </div>
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-text">الحالة الحالية</h2>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <div className="space-y-1.5 text-sm text-brand-text-2">
            <p>الخطة: <span className="text-brand-text">{tenant.plan}</span></p>
            <p>
              الفروع: <span className="text-brand-text">{tenant.branches_used} / {tenant.total_branches_allowed === -1 ? "غير محدود" : tenant.total_branches_allowed}</span>
            </p>
            <p>
              الطلاب: <span className="text-brand-text">{tenant.students_count} / {tenant.max_students === -1 ? "غير محدود" : tenant.max_students}</span>
            </p>
            {expiryDate && daysLeft !== null && (
              <p className={daysLeft <= 7 ? "font-semibold text-brand-orange" : ""}>
                {tenant.status === "trial" ? "تنتهي التجربة خلال" : "ينتهي الاشتراك خلال"} {daysLeft} {daysLeft === 1 ? "يوم" : "أيام"}
              </p>
            )}
            <p>إجمالي المدفوع: <span className="text-brand-text">{tenant.total_paid} د.ل</span></p>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="mb-3 font-semibold text-brand-text">إجراءات سريعة</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveModal("activate")}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark"
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
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-brand-border bg-brand-surface p-5">
        <h2 className="mb-3 font-semibold text-brand-text">سجل الاشتراكات</h2>
        {tenant.subscriptions.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {tenant.subscriptions.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-brand-surface-3 px-3 py-2">
                <span className="text-brand-text">
                  {s.plan} — {s.amount} {s.currency}
                </span>
                <span className="text-brand-text-2">{new Date(s.starts_at).toLocaleDateString("ar")}</span>
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
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-brand-surface-3 px-3 py-2">
                <span className="text-brand-text">{s.username}</span>
                <span className="text-brand-text-2">{s.role === "admin" ? "مدير" : "موظف"}</span>
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
    </div>
  );
}
