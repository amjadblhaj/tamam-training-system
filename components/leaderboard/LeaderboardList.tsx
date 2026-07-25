import { Trophy } from "lucide-react";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardList({ entries, showBranch }: { entries: LeaderboardEntry[]; showBranch: boolean }) {
  if (entries.length === 0) {
    return <p className="text-center text-sm text-brand-surface-2">لا يوجد طلاب بعد</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-brand-dark-2 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-brand-orange">
            {index === 0 ? <Trophy size={16} className="text-brand-orange" /> : index + 1}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-brand-surface">{entry.full_name}</p>
            {showBranch && entry.branch_name_ar && (
              <p className="text-xs text-brand-surface-2">{entry.branch_name_ar}</p>
            )}
          </div>
          <p className="font-bold text-brand-orange">{entry.points}</p>
        </div>
      ))}
    </div>
  );
}
