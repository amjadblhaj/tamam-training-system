"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/get-session";
import type { Branch } from "@/types";

export async function getBranches(): Promise<Branch[]> {
  const session = await getSession();
  if (!session) return [];

  const db = getSupabaseAdmin();
  const { data } = await db
    .from("branches")
    .select("id, name, name_ar, active")
    .eq("tenant_id", session.tenantId)
    .order("id");
  return data ?? [];
}
