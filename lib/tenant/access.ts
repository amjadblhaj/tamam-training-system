import type { TenantStatus } from "@/types";

/** True when a tenant is in read-only mode (all write actions hidden/blocked). */
export function isReadOnly(status: TenantStatus): boolean {
  return status === "suspended" || status === "expired";
}

/** True when a tenant may perform writes (trial or active subscription). */
export function canOperate(status: TenantStatus): boolean {
  return status === "trial" || status === "active";
}

/** User-facing Arabic explanation for why a suspended/expired tenant is read-only, or null if not applicable. */
export function getAccessMessage(status: TenantStatus): string | null {
  if (status === "suspended") {
    return "اشتراكك موقوف مؤقتاً — تواصل معنا لإعادة التفعيل";
  }
  if (status === "expired") {
    return "انتهت صلاحية اشتراكك — جدد الاشتراك للاستمرار";
  }
  return null;
}

interface TenantExpiryInfo {
  status: TenantStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

/**
 * Days remaining until a tenant's trial or subscription expires.
 *
 * Trial tenants count down to `trial_ends_at`, active tenants to
 * `subscription_ends_at`; suspended/expired tenants have no applicable
 * countdown (`null`). Shared by the tenants list and detail pages so both
 * report the same number.
 */
export function getDaysRemaining(tenant: TenantExpiryInfo): number | null {
  const expiryDate = tenant.status === "trial" ? tenant.trial_ends_at : tenant.subscription_ends_at;
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
