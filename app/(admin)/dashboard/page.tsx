import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const [branches, session] = await Promise.all([getBranches(), getSession()]);
  const isStaff = session?.role === "staff";
  const staffBranchName = isStaff ? (branches.find((b) => b.id === session?.branchId)?.name_ar ?? "") : null;

  return (
    <DashboardClient
      branches={branches}
      isStaff={isStaff}
      staffBranchId={session?.branchId ?? null}
      staffBranchName={staffBranchName}
    />
  );
}
