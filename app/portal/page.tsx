import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import { getPortalRewards, getPortalTransactions } from "./actions";
import { getTenantStatus } from "@/lib/actions/tenant";
import { PortalClient } from "./PortalClient";

export default async function PortalPage() {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/login");
  }

  const studentId = Number(session.id);
  const db = getSupabaseAdmin();

  const [{ data: student }, rewards, transactions, tenantStatus] = await Promise.all([
    db.from("students").select("points, student_code").eq("id", studentId).maybeSingle(),
    getPortalRewards(),
    getPortalTransactions(),
    getTenantStatus(),
  ]);

  return (
    <PortalClient
      studentName={session.name}
      studentCode={student?.student_code ?? null}
      initialBalance={student?.points ?? 0}
      initialRewards={rewards}
      initialTransactions={transactions}
      initialTenantStatus={tenantStatus}
    />
  );
}
