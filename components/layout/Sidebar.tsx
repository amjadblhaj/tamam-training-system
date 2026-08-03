"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Gift,
  FileSpreadsheet,
  ClipboardList,
  Award,
  Settings,
  Link2,
  Trophy,
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
  { href: "/branches", label: "الفروع", icon: Building2 },
  { href: "/registration-links", label: "روابط التسجيل", icon: Link2 },
  { href: "/leaderboards", label: "لوحات المتصدرين", icon: Trophy },
  { href: "/grant", label: "منح النقاط", icon: Gift },
  { href: "/excel", label: "منح النقاط بالإكسل", icon: FileSpreadsheet },
  { href: "/activity", label: "سجل النشاط", icon: ClipboardList },
  { href: "/rewards", label: "المكافآت", icon: Award, adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  role: SessionRole;
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ role, open, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <nav
      className={`fixed inset-y-0 right-0 z-40 flex w-64 shrink-0 transform flex-col bg-brand-dark px-4 py-6 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="mb-8 px-2">
        <Image src="/logo-full.png" alt="تمام" width={140} height={70} className="h-auto w-[140px]" priority />
        <p className="mt-1 text-xs text-brand-surface-2">أكاديمية قرار للتدريب والتطوير</p>
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-green text-brand-dark" : "text-brand-surface-2 hover:bg-brand-dark-2"
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
