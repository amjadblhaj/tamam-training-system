"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import type { BranchRegistrationLink } from "@/types";

export async function getBranchRegistrationLinks(): Promise<BranchRegistrationLink[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("branches")
    .select("id, name_ar, registration_token")
    .eq("tenant_id", session.tenantId)
    .eq("active", true)
    .order("id");

  return data ?? [];
}
