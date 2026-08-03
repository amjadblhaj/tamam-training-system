"use server";

import { getSession } from "@/lib/auth/get-session";
import { getScope } from "@/lib/auth/scope";
import { assertTenantCanWrite } from "@/lib/tenant/resolve-status";
import { processExcelAdvanced } from "@/lib/excel/advancedProcessor";
import { executeGrant } from "@/lib/excel/executeGrant";
import { recordAuditLog } from "@/lib/audit";
import type {
  ExcelNameRow,
  ProcessedPhone,
  ExcelWizardProcessResponse,
  ExcelWizardExecuteResponse,
} from "@/types";

const MAX_WIZARD_ROWS = 2000;

/**
 * Step 5 of the wizard: categorizes an already-parsed (client-side) sheet
 * into existing/other-branch/new buckets for review. Branch ownership is
 * re-checked here regardless of what the client's UI already enforced —
 * a staff request naming another branch is rejected outright, not silently
 * corrected, so a forged request fails loudly rather than quietly
 * succeeding against the wrong branch.
 */
export async function processExcelWizardBatch(
  rows: ExcelNameRow[],
  branchId: number,
  pointsPerOccurrence: number,
  reason: string
): Promise<ExcelWizardProcessResponse> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  if (scope.role === "staff" && branchId !== scope.branchId) {
    return { success: false, error: "لا تملك صلاحية على فرع آخر" };
  }
  if (!Number.isInteger(pointsPerOccurrence) || pointsPerOccurrence < 1 || pointsPerOccurrence > 9999) {
    return { success: false, error: "قيمة النقاط غير صحيحة" };
  }
  if (!reason.trim()) return { success: false, error: "السبب مطلوب" };
  if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: "الملف فارغ" };
  if (rows.length > MAX_WIZARD_ROWS) {
    return { success: false, error: `الحد الأقصى ${MAX_WIZARD_ROWS} صف لكل ملف` };
  }

  const result = await processExcelAdvanced(rows, branchId, pointsPerOccurrence, reason, scope.tenantId);
  return { success: true, result };
}

/**
 * Step 6 of the wizard: registers the approved new phones then grants points
 * to everyone in one batch (see lib/excel/executeGrant.ts). Branch ownership
 * is re-checked here too — the reviewed batch round-trips through the client
 * between processing and confirmation, so this is the last point where a
 * staff user's own branch is verified before any writes happen.
 */
export async function executeExcelWizardGrant(
  branchId: number,
  reason: string,
  pointsPerOccurrence: number,
  existingMatches: ProcessedPhone[],
  approvedNewPhones: ProcessedPhone[]
): Promise<ExcelWizardExecuteResponse> {
  const session = await getSession();
  if (!session) return { success: false, error: "غير مصرح" };
  const scope = getScope(session);
  if (!scope) return { success: false, error: "غير مصرح" };

  const writeCheck = await assertTenantCanWrite(scope.tenantId);
  if (!writeCheck.allowed) return { success: false, error: writeCheck.error };

  if (scope.role === "staff" && branchId !== scope.branchId) {
    return { success: false, error: "لا تملك صلاحية على فرع آخر" };
  }

  const result = await executeGrant({
    tenantId: scope.tenantId,
    branchId,
    reason,
    pointsPerOccurrence,
    existingMatches,
    approvedNewPhones,
    grantedBy: session.name,
  });

  await recordAuditLog({
    tenantId: scope.tenantId,
    actor: session.name,
    actorRole: session.role,
    action: "excel_wizard_grant",
    metadata: {
      branchId,
      reason,
      pointsPerOccurrence,
      createdCount: result.createdCount,
      grantedCount: result.grantedCount,
      totalPoints: result.totalPoints,
      errorCount: result.errors.length,
    },
  });

  return { success: true, result };
}
