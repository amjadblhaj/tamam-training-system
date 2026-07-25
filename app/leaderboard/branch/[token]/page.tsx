import { getSupabaseAdmin } from "@/lib/supabase/server";
import { InvalidLinkCard } from "@/components/shared/InvalidLinkCard";
import { LeaderboardList } from "@/components/leaderboard/LeaderboardList";
import type { LeaderboardEntry } from "@/types";

export default async function PublicBranchLeaderboardPage({ params }: { params: { token: string } }) {
  const db = getSupabaseAdmin();

  const { data: branch } = await db
    .from("branches")
    .select("id, name_ar, tenant_id, active, tenants(academy_name)")
    .eq("leaderboard_token", params.token)
    .maybeSingle();

  if (!branch || !branch.active) {
    return <InvalidLinkCard title="رابط غير صالح" message="لوحة المتصدرين غير متاحة" />;
  }

  const { data } = await db
    .from("students")
    .select("id, full_name, points")
    .eq("branch_id", branch.id)
    .eq("tenant_id", branch.tenant_id)
    .eq("active", true)
    .order("points", { ascending: false })
    .limit(10);

  const entries: LeaderboardEntry[] = data ?? [];
  const academyName = (branch.tenants as unknown as { academy_name: string } | null)?.academy_name ?? "";

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-brand-green">لوحة متصدري {branch.name_ar}</h1>
          <p className="mt-1 text-sm text-brand-surface-2">{academyName}</p>
        </div>
        <LeaderboardList entries={entries} showBranch={false} />
      </div>
    </main>
  );
}
