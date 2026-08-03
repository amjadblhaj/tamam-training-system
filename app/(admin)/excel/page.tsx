import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { GrantWizard } from "@/components/grant/GrantWizard";

export default async function ExcelPage() {
  const [branches, session] = await Promise.all([getBranches(), getSession()]);
  const isStaff = session?.role === "staff";
  const staffBranchName = isStaff ? (branches.find((b) => b.id === session?.branchId)?.name_ar ?? "") : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-brand-text">منح النقاط عبر إكسل</h1>
      <GrantWizard
        branches={branches}
        isStaff={isStaff}
        staffBranchId={session?.branchId ?? null}
        staffBranchName={staffBranchName}
      />
    </div>
  );
}
