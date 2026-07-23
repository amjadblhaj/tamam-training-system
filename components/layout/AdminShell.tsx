"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TrialBanner } from "@/components/layout/TrialBanner";
import { ReadOnlyBanner } from "@/components/layout/ReadOnlyBanner";
import type { SessionRole } from "@/lib/auth/session";
import type { TenantStatusInfo } from "@/types";

interface AdminShellProps {
  role: SessionRole;
  name: string;
  logoutAction: () => Promise<void>;
  initialTenantStatus: TenantStatusInfo | null;
  children: React.ReactNode;
}

export function AdminShell({ role, name, logoutAction, initialTenantStatus, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const seeded = useRef(false);
  if (!seeded.current) {
    queryClient.setQueryData(["tenant-status"], initialTenantStatus);
    seeded.current = true;
  }

  return (
    <div className="flex min-h-screen bg-brand-surface-2">
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />
      )}
      <Sidebar role={role} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-border bg-brand-surface px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-brand-text-2 md:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>
            <p className="text-sm text-brand-text-2">
              مرحبًا، <span className="font-semibold text-brand-text">{name}</span>
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-brand-border px-4 py-1.5 text-sm font-medium text-brand-text-2 transition-colors hover:bg-brand-surface-3"
            >
              تسجيل الخروج
            </button>
          </form>
        </header>
        <TrialBanner />
        <ReadOnlyBanner />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
