"use client";

import type { LucideIcon } from "lucide-react";

interface BulkActionBarProps {
  count: number;
  /** e.g. "حركة" or "طالب" — appended after the count. */
  itemLabel: string;
  actionLabel: string;
  icon: LucideIcon;
  onActionClick: () => void;
}

/** Generic "N selected — [action]" bar shown above a table once at least one row is checked. */
export function BulkActionBar({ count, itemLabel, actionLabel, icon: Icon, onActionClick }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-green bg-brand-green-light px-4 py-2.5">
      <span className="text-sm font-medium text-brand-text">
        تم تحديد {count} {itemLabel}
      </span>
      <button
        onClick={onActionClick}
        className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-brand-dark transition active:scale-[0.98] hover:opacity-90"
      >
        <Icon size={14} /> {actionLabel}
      </button>
    </div>
  );
}
