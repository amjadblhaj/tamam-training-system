import { GrantForm } from "@/components/points/GrantForm";
import { BranchBadge } from "@/components/shared/BranchBadge";
import { getSession } from "@/lib/auth/get-session";
import { getBranches } from "@/lib/actions/branches";

export default async function GrantPage() {
  const session = await getSession();
  const isStaff = session?.role === "staff";
  let staffBranchName: string | null = null;
  if (isStaff) {
    const branches = await getBranches();
    staffBranchName = branches.find((b) => b.id === session?.branchId)?.name_ar ?? "";
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-brand-text">منح النقاط</h1>
        {isStaff && staffBranchName && <BranchBadge branchName={staffBranchName} />}
      </div>
      <GrantForm />
    </div>
  );
}
