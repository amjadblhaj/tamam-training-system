import { Building2 } from "lucide-react";

/**
 * Shown next to a page title for staff (never admin, who isn't locked to one
 * branch) so it's always visible which branch's data they're looking at.
 */
export function BranchBadge({ branchName }: { branchName: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-light px-3 py-1 text-xs font-semibold text-brand-green-dark">
      <Building2 size={12} />
      الفرع: {branchName}
    </span>
  );
}
