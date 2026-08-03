import { notFound } from "next/navigation";
import { getStudentById, getStudentPointsHistory, getStudentRedemptions } from "../actions";
import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { DeactivateStudentButton } from "@/components/students/DeactivateStudentButton";
import { TransferStudentButton } from "@/components/students/TransferStudentModal";
import { StudentCode } from "@/components/students/StudentCode";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const student = await getStudentById(id);
  if (!student) notFound();

  const [history, redemptions, branches, session] = await Promise.all([
    getStudentPointsHistory(id),
    getStudentRedemptions(id),
    getBranches(),
    getSession(),
  ]);
  const isAdmin = session?.role === "admin";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-surface p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-brand-text">{student.full_name}</h1>
            <StudentCode code={student.student_code} />
          </div>
          <p className="mt-1 text-sm text-brand-text-2">
            {student.phone} — {student.branch_name_ar}
          </p>
          <p className="mt-3 text-3xl font-bold text-brand-orange">{student.points} نقطة</p>
        </div>
        {student.active && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <TransferStudentButton
                studentId={student.id}
                currentBranchId={student.branch_id}
                branches={branches}
              />
            )}
            <DeactivateStudentButton studentId={student.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 font-semibold text-brand-text">سجل النقاط</h2>
          {history.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between">
                  <span className="text-brand-text">{h.action}</span>
                  <span
                    className={
                      h.points >= 0 ? "font-semibold text-brand-green" : "font-semibold text-brand-orange"
                    }
                  >
                    {h.points >= 0 ? `+${h.points}` : h.points}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-text-3">لا يوجد سجل نقاط بعد</p>
          )}
        </div>

        <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 font-semibold text-brand-text">سجل الاستبدالات</h2>
          {redemptions.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between">
                  <span className="text-brand-text">{r.reward_name_ar}</span>
                  <span className="text-brand-text-2">{r.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-text-3">لا يوجد استبدالات بعد</p>
          )}
        </div>
      </div>
    </div>
  );
}
