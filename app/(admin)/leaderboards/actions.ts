"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import type { BranchLeaderboardLink, OverallLeaderboardLink } from "@/types";

export async function getBranchLeaderboardLinks(): Promise<BranchLeaderboardLink[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("branches")
    .select("id, name_ar, leaderboard_token")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .order("id");

  return data ?? [];
}

export async function getOverallLeaderboardLink(): Promise<OverallLeaderboardLink | null> {
  const session = await getSession();
  if (!session) return null;

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("tenants")
    .select("academy_name, leaderboard_token")
    .eq("id", session.tenantId)
    .maybeSingle();

  return data ?? null;
}
