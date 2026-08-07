"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { getPendingRedemptionsCount } from "@/app/(admin)/redemptions/actions";
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
  { href: "/registration-links", label: "روابط الطلاب", icon: Link2 },
  { href: "/leaderboards", label: "لوحات المتصدرين", icon: Trophy },
  { href: "/grant", label: "منح النقاط", icon: Gift },
  { href: "/excel", label: "منح النقاط بالإكسل", icon: FileSpreadsheet },
  { href: "/activity", label: "سجل النشاط", icon: ClipboardList },
  { href: "/redemptions", label: "طلبات الاستبدال", icon: PackageCheck },
  { href: "/rewards", label: "المكافآت", icon: Award, adminOnly: true },
  { href: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
];

const PENDING_REDEMPTIONS_REFRESH_MS = 30_000;

interface SidebarProps {
  role: SessionRole;
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ role, open, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  const { data: pendingRedemptions = 0 } = useQuery({
    queryKey: ["pending-redemptions-count"],
    queryFn: () => getPendingRedemptionsCount(),
    refetchInterval: PENDING_REDEMPTIONS_REFRESH_MS,
  });

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
          const showBadge = item.href === "/redemptions" && pendingRedemptions > 0;
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
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-xs font-bold text-brand-dark">
                    {pendingRedemptions}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
