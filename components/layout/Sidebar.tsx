"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Gift,
  FileSpreadsheet,
  ClipboardList,
  Award,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { SessionRole } from "@/lib/auth/session";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/students", label: "الطلاب", icon: Users },
  { href: "/grant", label: "منح النقاط", icon: Gift },
  { href: "/excel", label: "استيراد إكسل", icon: FileSpreadsheet },
  { href: "/activity", label: "سجل النشاط", icon: ClipboardList },
  { href: "/rewards", label: "المكافآت", icon: Award, adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
];

export function Sidebar({ role }: { role: SessionRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav className="flex h-screen w-64 shrink-0 flex-col bg-brand-dark px-4 py-6">
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold text-brand-green">تمام</h1>
        <p className="text-xs text-brand-surface-2">أكاديمية قرار للتدريب والتطوير</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-green text-brand-dark"
                    : "text-brand-surface-2 hover:bg-brand-dark-2"
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
  );
}
