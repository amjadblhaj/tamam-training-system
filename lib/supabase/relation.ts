/**
 * Reads one field off a Supabase nested-relation join (e.g. the `branches`
 * object from `.select("id, branches(name_ar)")`).
 *
 * The Supabase client here isn't built with generated types (see
 * ARCHITECTURE.md), so a singular join comes back typed as `unknown` rather
 * than its real joined-row shape. This centralizes the one cast needed to
 * read it instead of repeating `(x as unknown as { field: T } | null)?.field`
 * at every call site.
 */
export function relationValue<T>(relation: unknown, key: string): T | null {
  if (!relation || typeof relation !== "object") return null;
  return (relation as Record<string, unknown>)[key] as T | null;
}
