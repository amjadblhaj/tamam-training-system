import Image from "next/image";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { InvalidLinkCard } from "@/components/shared/InvalidLinkCard";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import { relationValue } from "@/lib/supabase/relation";
import type { LeaderboardEntry } from "@/types";

export default async function PublicOverallLeaderboardPage({ params }: { params: { token: string } }) {
  const db = getSupabaseAdmin();

  const { data: tenant } = await db
    .from("tenants")
    .select("id, academy_name")
    .eq("leaderboard_token", params.token)
    .maybeSingle();

  if (!tenant) {
    return <InvalidLinkCard title="رابط غير صالح" message="لوحة المتصدرين غير متاحة" />;
  }

  const { data } = await db
    .from("students")
    .select("id, full_name, points, branches(name_ar)")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(10);

  const entries: LeaderboardEntry[] = (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: s.points,
    branch_name_ar: relationValue<string>(s.branches, "name_ar"),
  }));

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <Image
            src="/logo-mark.png"
            alt="تمام"
            width={90}
            height={33}
            className="mx-auto mb-3 h-auto w-[90px]"
          />
          <h1 className="text-xl font-bold text-brand-green">لوحة المتصدرين العامة</h1>
          <p className="mt-1 text-sm text-brand-surface-2">{tenant.academy_name}</p>
        </div>
        <LeaderboardList entries={entries} showBranch />
      </div>
    </main>
  );
}
