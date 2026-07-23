import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { canOperate } from "@/lib/tenant/access";
import type { TenantStatus } from "@/types";

interface ResolvedTenant {
  status: TenantStatus;
  academyName: string;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

// Auto-expiry is checked here (read/write time) rather than in middleware on
// every request — a DB round trip per navigation would hurt page-load perf.
// Never blocks entry, only ever downgrades trial/active to suspended.
export async function resolveTenantStatus(tenantId: string): Promise<ResolvedTenant | null> {
  const db = getSupabaseAdmin();
  const { data: tenant } = await db
    .from("tenants")
    .select("academy_name, status, trial_ends_at, subscription_ends_at")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant) return null;

  const now = new Date();
  let status = tenant.status as TenantStatus;

  if (status === "trial" && tenant.trial_ends_at && now > new Date(tenant.trial_ends_at)) {
    await db.from("tenants").update({ status: "suspended" }).eq("id", tenantId);
    status = "suspended";
  } else if (status === "active" && tenant.subscription_ends_at && now > new Date(tenant.subscription_ends_at)) {
    await db.from("tenants").update({ status: "suspended" }).eq("id", tenantId);
    status = "suspended";
  }

  return {
    status,
    academyName: tenant.academy_name,
    trialEndsAt: tenant.trial_ends_at,
    subscriptionEndsAt: tenant.subscription_ends_at,
  };
}

export async function assertTenantCanWrite(tenantId: string): Promise<{ allowed: boolean; error?: string }> {
  const resolved = await resolveTenantStatus(tenantId);
  if (!resolved) return { allowed: false, error: "الحساب غير موجود" };
  if (!canOperate(resolved.status)) {
    return { allowed: false, error: "اشتراكك متوقف حالياً — لا يمكن إجراء تعديلات في وضع القراءة فقط" };
  }
  return { allowed: true };
}
