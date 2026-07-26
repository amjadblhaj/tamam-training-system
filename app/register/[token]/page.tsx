import { getBranchByToken } from "./actions";
import { RegisterClient } from "./RegisterClient";
import { InvalidLinkCard } from "@/components/shared/InvalidLinkCard";

export default async function RegisterPage({ params }: { params: { token: string } }) {
  const branch = await getBranchByToken(params.token);

  if (!branch) {
    return (
      <InvalidLinkCard
        title="رابط التسجيل غير صالح"
        message="يرجى التواصل مع الفرع للحصول على رابط تسجيل صحيح"
      />
    );
  }

  return (
    <RegisterClient token={params.token} branchNameAr={branch.name_ar} academyName={branch.academyName} />
  );
}
