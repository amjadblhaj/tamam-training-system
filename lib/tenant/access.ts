import type { TenantStatus } from "@/types";

export function isReadOnly(status: TenantStatus): boolean {
  return status === "suspended" || status === "expired";
}

export function canOperate(status: TenantStatus): boolean {
  return status === "trial" || status === "active";
}

export function getAccessMessage(status: TenantStatus): string | null {
  if (status === "suspended") {
    return "اشتراكك موقوف مؤقتاً — تواصل معنا لإعادة التفعيل";
  }
  if (status === "expired") {
    return "انتهت صلاحية اشتراكك — جدد الاشتراك للاستمرار";
  }
  return null;
}
