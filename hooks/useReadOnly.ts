"use client";

import { useQuery } from "@tanstack/react-query";
import { getTenantStatus } from "@/lib/actions/tenant";
import { isReadOnly, getAccessMessage } from "@/lib/tenant/access";
import type { TenantStatusInfo } from "@/types";

// queryKey is shared app-wide: whichever component mounts first fetches
// (or the seeded initialData is used), every other useReadOnly() call
// anywhere in the tree reads the same cached value — no need to thread
// tenant status through props everywhere.
export function useReadOnly(initialStatus?: TenantStatusInfo | null) {
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
