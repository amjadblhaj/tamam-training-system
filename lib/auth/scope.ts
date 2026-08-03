import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SessionPayload } from "@/lib/auth/session";

export interface UserScope {
  tenantId: string;
  role: "admin" | "staff";
  branchId: number | null;
}

/**
 * Derives a branch-aware scope from a tenant session. Returns `null` for
 * student sessions (the student portal has its own, separate access model —
 * every query there is already keyed to the logged-in student's own id).
 */
export function getScope(session: SessionPayload): UserScope | null {
  if (session.role !== "admin" && session.role !== "staff") return null;
  return { tenantId: session.tenantId, role: session.role, branchId: session.branchId };
}

/**
 * Resolves the effective branch filter for a list query: staff are always
 * locked to their own branch regardless of what they request; admin may
 * optionally filter by a specific branch, or omit it to see every branch.
 */
export function getBranchFilter(scope: UserScope, requestedBranchId?: number | null): number | null {
  if (scope.role === "staff") return scope.branchId;
  return requestedBranchId ?? null;
}

async function studentBranchId(tenantId: string, studentId: number): Promise<number | null> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("students")
    .select("branch_id")
    .eq("id", studentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data?.branch_id ?? null;
}

/**
 * Verifies the given student belongs to the caller's own branch before any
 * write. Admin always passes. Throws (rather than returning a boolean) so a
 * server action that forgets to check its return value fails loudly instead
 * of silently letting a cross-branch write through.
 */
export async function assertBranchAccess(scope: UserScope, studentId: number): Promise<void> {
  if (scope.role === "admin") return;
  const branchId = await studentBranchId(scope.tenantId, studentId);
  if (branchId === null || branchId !== scope.branchId) {
    throw new Error("لا تملك صلاحية الوصول لطلاب فرع آخر");
  }
}
