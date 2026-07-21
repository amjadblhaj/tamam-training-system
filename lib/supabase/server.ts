import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Bypasses RLS — server-side use only, never import from a client component.
// Lazily constructed so merely importing this module (e.g. transitively, via
// an unrelated server action) doesn't require the env vars to be present —
// only actually calling getSupabaseAdmin() does.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin client is not configured (missing env vars)");
  }

  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return client;
}
