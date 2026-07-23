import { getBranchByToken } from "./actions";
import { RegisterClient } from "./RegisterClient";

export default async function RegisterPage({ params }: { params: { token: string } }) {
  const branch = await getBranchByToken(params.token);

  if (!branch) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-dark px-4">
        <div className="w-full max-w-md rounded-2xl bg-brand-surface p-8 text-center shadow-xl">
          <h1 className="text-xl font-bold text-brand-orange">رابط التسجيل غير صالح</h1>
          <p className="mt-2 text-sm text-brand-text-2">يرجى التواصل مع الفرع للحصول على رابط تسجيل صحيح</p>
        </div>
      </main>
    );
  }

  return <RegisterClient token={params.token} branchNameAr={branch.name_ar} academyName={branch.academyName} />;
}
