import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { logout } from "@/app/login/actions";
import { Sidebar } from "@/components/layout/Sidebar";

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role === "student") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-brand-surface-2">
      <Sidebar role={session.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-6 py-4">
          <p className="text-sm text-brand-text-2">
            مرحبًا، <span className="font-semibold text-brand-text">{session.name}</span>
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
            >
              تسجيل الخروج
            </button>
          </form>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
