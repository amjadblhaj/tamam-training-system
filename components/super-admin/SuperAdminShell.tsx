"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/super-admin/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/super-admin/tenants", label: "العملاء", icon: Building2 },
];

interface SuperAdminShellProps {
  username: string;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
}

export function SuperAdminShell({ username, logoutAction, children }: SuperAdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-brand-surface-2">
      <nav className="flex h-screen w-64 shrink-0 flex-col bg-brand-dark px-4 py-6">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-bold text-brand-orange">مزايا</h1>
          <p className="text-xs text-brand-surface-2">لوحة تحكم المشرف العام</p>
        </div>
        <ul className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-brand-orange text-white" : "text-brand-surface-2 hover:bg-brand-dark-2"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-6 py-4">
          <p className="text-sm text-brand-text-2">
            مرحبًا، <span className="font-semibold text-brand-text">{username}</span>
          </p>
          <form action={logoutAction}>
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
