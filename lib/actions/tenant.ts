"use server";

import { getSession } from "@/lib/auth/get-session";
import { resolveTenantStatus } from "@/lib/tenant/resolve-status";
import type { TenantStatusInfo } from "@/types";

export async function getTenantStatus(): Promise<TenantStatusInfo | null> {
  const session = await getSession();
  if (!session) return null;

  const resolved = await resolveTenantStatus(session.tenantId);
  if (!resolved) return null;

  return {
    academyName: resolved.academyName,
    status: resolved.status,
    trialEndsAt: resolved.trialEndsAt,
    subscriptionEndsAt: resolved.subscriptionEndsAt,
  };
}
