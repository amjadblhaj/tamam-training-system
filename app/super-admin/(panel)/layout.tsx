import { redirect } from "next/navigation";
import { getSuperAdminSession } from "@/lib/auth/get-super-admin-session";
import { superAdminLogout } from "@/app/super-admin/login/actions";
import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";

export default async function SuperAdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect("/super-admin/login");
  }

  return (
    <SuperAdminShell username={session.username} logoutAction={superAdminLogout}>
      {children}
    </SuperAdminShell>
  );
}
