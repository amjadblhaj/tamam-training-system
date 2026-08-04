"use client";

import { Undo2 } from "lucide-react";

export function BulkActionBar({ count, onUndoClick }: { count: number; onUndoClick: () => void }) {
  if (count === 0) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-brand-green bg-brand-green-light px-4 py-2.5">
      <span className="text-sm font-medium text-brand-text">تم تحديد {count} حركة</span>
      <button
        onClick={onUndoClick}
        className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-brand-dark transition active:scale-[0.98] hover:opacity-90"
      >
        <Undo2 size={14} /> تراجع عن المحدد
      </button>
    </div>
  );
}
