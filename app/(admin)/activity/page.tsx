import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { ActivityClient } from "./ActivityClient";

export default async function ActivityPage() {
  const [branches, session] = await Promise.all([getBranches(), getSession()]);
  const isStaff = session?.role === "staff";
  const staffBranchName = isStaff ? (branches.find((b) => b.id === session?.branchId)?.name_ar ?? "") : null;

  return (
    <ActivityClient
      branches={branches}
      isAdmin={session?.role === "admin"}
      isStaff={isStaff}
      staffBranchId={session?.branchId ?? null}
      staffBranchName={staffBranchName}
    />
  );
}
