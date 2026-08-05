import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface RegistrationLogEntry {
  tenantId: string;
  studentId: number;
  fullName: string;
  studentCode: string;
  branchId: number;
  grantedBy: string;
}

/**
 * Records a `registration` notification entry in `points_log` for each newly
 * created student — a zero-point row surfaced in the activity log so new
 * registrations are visible alongside real point transactions, whether the
 * student was added manually (one entry) or via the Excel wizard (one entry
 * per student, batched in a single insert). Best-effort: the student account
 * itself has already been created by the time this runs, so a logging
 * failure here shouldn't be reported back as a registration failure.
 */
export async function recordStudentRegistrations(entries: RegistrationLogEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const db = getSupabaseAdmin();
  await db.from("points_log").insert(
    entries.map((e) => ({
      tenant_id: e.tenantId,
      student_id: e.studentId,
      points: 0,
      action: `تسجيل طالب جديد: ${e.fullName} (${e.studentCode})`,
      type: "registration",
      granted_by: e.grantedBy,
      branch_id: e.branchId,
    }))
  );
}
