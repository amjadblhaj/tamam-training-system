import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { logout } from "@/app/login/actions";
import { AdminShell } from "@/components/layout/AdminShell";

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role === "student") {
    redirect("/login");
  }

  return (
    <AdminShell role={session.role} name={session.name} logoutAction={logout}>
      {children}
    </AdminShell>
  );
}
