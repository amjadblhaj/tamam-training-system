"use client";

import { useQuery } from "@tanstack/react-query";
import { getTenantStatus } from "@/lib/actions/tenant";
import { isReadOnly, getAccessMessage } from "@/lib/tenant/access";
import type { TenantStatusInfo, TenantStatus } from "@/types";

interface UseReadOnlyResult {
  readOnly: boolean;
  canEdit: boolean;
  message: string | null;
  status: TenantStatus;
  academyName: string | null;
  trialEndsAt: string | null;
}

/**
 * Reads the current tenant's read-only status. Use in any component that
 * renders a write action (button, form) to hide/disable it when the tenant
 * is suspended or expired.
 *
 * The `["tenant-status"]` query key is shared app-wide: whichever component
 * mounts first fetches (or the seeded `initialData` from `AdminShell`/
 * `PortalClient` is used), every other `useReadOnly()` call anywhere in the
 * tree reads the same cached value — no need to thread tenant status through
 * props everywhere.
 * @param initialStatus - Seed value for the very first render (avoids a loading flash); normally omitted, since `AdminShell`/`PortalClient` already seed the query cache directly.
 */
export function useReadOnly(initialStatus?: TenantStatusInfo | null): UseReadOnlyResult {
  const { data } = useQuery({
    queryKey: ["tenant-status"],
    queryFn: () => getTenantStatus(),
    initialData: initialStatus,
    refetchInterval: 30_000,
  });

  const status = data?.status ?? "active";
  const readOnly = isReadOnly(status);

  return {
    readOnly,
    canEdit: !readOnly,
    message: getAccessMessage(status),
    status,
    academyName: data?.academyName ?? null,
    trialEndsAt: data?.trialEndsAt ?? null,
  };
}
