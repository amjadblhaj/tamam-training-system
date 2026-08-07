import { MedalRow, MedalCrown, getMedalStyle } from "@/components/leaderboard/MedalRow";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardList({
  entries,
  showBranch,
}: {
  entries: LeaderboardEntry[];
  showBranch: boolean;
}) {
  if (entries.length === 0) {
    return <p className="text-center text-sm text-brand-surface-2">لا يوجد طلاب بعد</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const rank = index + 1;
        const medal = getMedalStyle(rank);
        return (
          <MedalRow
            key={entry.id}
            rank={rank}
            fallbackClassName="rounded-xl bg-brand-dark-2"
            className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
          >
            <div className="flex items-center gap-3 p-4" style={{ animationDelay: `${index * 40}ms` }}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  medal ? "" : "bg-brand-dark text-brand-orange"
                }`}
                style={medal ? { backgroundColor: medal.color, color: "#FFFFFF" } : undefined}
              >
                {rank}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${medal ? "text-brand-dark" : "text-brand-surface"}`}>
                  {entry.full_name}
                </p>
                {showBranch && entry.branch_name_ar && (
                  <p className={`text-xs ${medal ? "text-brand-text-2" : "text-brand-surface-2"}`}>
                    {entry.branch_name_ar}
                  </p>
                )}
              </div>
              <MedalCrown rank={rank} size={20} />
              <p className={`font-bold ${medal ? "text-brand-text" : "text-brand-orange"}`}>{entry.points}</p>
            </div>
          </MedalRow>
        );
      })}
    </div>
  );
}
