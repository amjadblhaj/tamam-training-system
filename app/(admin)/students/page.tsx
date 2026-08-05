import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { StudentsClient } from "./StudentsClient";

export default async function StudentsPage() {
  const [branches, session] = await Promise.all([getBranches(), getSession()]);
  const isStaff = session?.role === "staff";
  const staffBranchName = isStaff ? (branches.find((b) => b.id === session?.branchId)?.name_ar ?? "") : null;

  return (
    <StudentsClient
      branches={branches}
      isAdmin={session?.role === "admin"}
      isStaff={isStaff}
      staffBranchId={session?.branchId ?? null}
      staffBranchName={staffBranchName}
    />
  );
}
