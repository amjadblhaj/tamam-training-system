import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { hashPassword } from "@/lib/auth/password";
import type { ProcessedPhone, ExcelBatchExecuteInput, ExcelBatchExecuteResult } from "@/types";

const CONCURRENCY = 10;

/**
 * Registers approved new students in `input.branchId` first, then grants
 * points to everyone — pre-existing matches plus the students just created —
 * in one batch. Uses the same atomic, row-locked RPCs as the rest of the app
 * (`generate_student_code`, `grant_points_v2`) rather than hand-rolled
 * read/update/insert steps.
 *
 * `pointsToGrant` is recomputed here from `pointsPerOccurrence × occurrences`
 * instead of trusting the value on the incoming `ProcessedPhone` — that value
 * originated server-side but round-trips through the client between review
 * and confirmation, so trusting it verbatim would let a tampered request
 * inflate points past what the reviewed batch actually showed.
 *
 * Not fully atomic: if a specific student's grant RPC fails after their
 * account was already created, that failure is reported per-student in
 * `errors` rather than rolling back their registration — the same
 * partial-failure model the original Excel import already uses.
 *
 * Caller's responsibility: verify branchId belongs to the caller's session
 * (staff must own it, admin any) before calling this — this function has no
 * session/scope context of its own.
 */
export async function executeGrant(input: ExcelBatchExecuteInput): Promise<ExcelBatchExecuteResult> {
  const db = getSupabaseAdmin();
  const created: { name: string; phone: string; code: string }[] = [];
  const errors: string[] = [];

  const toGrant: ProcessedPhone[] = [...input.existingMatches];

  for (const np of input.approvedNewPhones) {
    const { data: codeResult } = await db.rpc("generate_student_code", {
      p_tenant_id: input.tenantId,
      p_branch_id: input.branchId,
    });
    if (!codeResult?.success) {
      errors.push(`${np.name} (${np.phone}): تعذر توليد كود الطالب`);
      continue;
    }

    // Password = phone number, per Phase 5 spec (login = phone + phone) —
    // distinct from manual/registration-link students, which get an
    // unguessable random placeholder password instead.
    const hashed = await hashPassword(np.phone);
    const { data: newStudent, error } = await db
      .from("students")
      .insert({
        tenant_id: input.tenantId,
        full_name: np.name,
        phone: np.phone,
        branch_id: input.branchId,
        password: hashed,
        student_code: codeResult.code,
        student_sequence: codeResult.sequence,
      })
      .select("id")
      .single();

    if (error || !newStudent) {
      errors.push(`${np.name} (${np.phone}): تعذر تسجيل الطالب (رقم الهاتف مستخدم بالفعل؟)`);
      continue;
    }

    created.push({ name: np.name, phone: np.phone, code: codeResult.code as string });
    toGrant.push({ ...np, studentId: newStudent.id, studentCode: codeResult.code as string });
  }

  const granted: { name: string; points: number }[] = [];

  for (let i = 0; i < toGrant.length; i += CONCURRENCY) {
    const chunk = toGrant.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (p) => {
        if (!p.studentId) return { name: p.name, points: 0, error: "لا يوجد طالب مرتبط بهذا الرقم" };

        const pointsToGrant = input.pointsPerOccurrence * p.occurrences;
        const action = p.occurrences > 1 ? `${input.reason} (× ${p.occurrences})` : input.reason;
        const note = `${input.pointsPerOccurrence} نقطة × ${p.occurrences} ${p.occurrences === 1 ? "مرة" : "مرات"}`;

        const { data, error } = await db.rpc("grant_points_v2", {
          p_tenant_id: input.tenantId,
          p_student_id: p.studentId,
          p_points: pointsToGrant,
          p_action: action,
          p_type: "excel",
          p_granted_by: input.grantedBy,
          p_note: note,
        });

        if (error || !data?.success) return { name: p.name, points: 0, error: "تعذر منح النقاط" };
        return { name: p.name, points: pointsToGrant, error: null as string | null };
      })
    );

    for (const r of chunkResults) {
      if (r.error) {
        errors.push(`${r.name}: ${r.error}`);
      } else {
        granted.push({ name: r.name, points: r.points });
      }
    }
  }

  return {
    createdCount: created.length,
    grantedCount: granted.length,
    totalPoints: granted.reduce((sum, g) => sum + g.points, 0),
    created,
    granted,
    errors,
  };
}
