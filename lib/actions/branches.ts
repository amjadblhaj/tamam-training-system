"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Branch } from "@/types";

export async function getBranches(): Promise<Branch[]> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("branches").select("id, name, name_ar, active").order("id");
  return data ?? [];
}
