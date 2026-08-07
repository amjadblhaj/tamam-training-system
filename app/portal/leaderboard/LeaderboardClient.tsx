"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MedalRow, MedalCrown, getMedalStyle } from "@/components/leaderboard/MedalRow";
import { getBranchLeaderboard, getOverallLeaderboard } from "../actions";
import type { LeaderboardEntry } from "@/types";

type Tab = "branch" | "overall";

export function LeaderboardClient({
  studentId,
  initialBranchBoard,
  initialOverallBoard,
}: {
  studentId: number;
  initialBranchBoard: LeaderboardEntry[];
  initialOverallBoard: LeaderboardEntry[];
}) {
  const [tab, setTab] = useState<Tab>("branch");

  const { data: branchBoard = initialBranchBoard } = useQuery({
    queryKey: ["portal-leaderboard-branch"],
    queryFn: () => getBranchLeaderboard(),
    initialData: initialBranchBoard,
  });

  const { data: overallBoard = initialOverallBoard } = useQuery({
    queryKey: ["portal-leaderboard-overall"],
    queryFn: () => getOverallLeaderboard(),
    initialData: initialOverallBoard,
  });

  const board = tab === "branch" ? branchBoard : overallBoard;

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/portal" className="text-brand-surface-2">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-xl font-bold text-brand-green">لوحة المتصدرين</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-brand-dark-2 p-1">
          <button
            type="button"
            onClick={() => setTab("branch")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "branch" ? "bg-brand-green text-brand-dark" : "text-brand-surface-2"
            }`}
          >
            فرعي
          </button>
          <button
            type="button"
            onClick={() => setTab("overall")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "overall" ? "bg-brand-green text-brand-dark" : "text-brand-surface-2"
            }`}
          >
            الكل
          </button>
        </div>

        <div className="space-y-2">
          {board.length > 0 ? (
            board.map((entry, index) => {
              const rank = index + 1;
              const medal = getMedalStyle(rank);
              const isMe = entry.id === studentId;
              return (
                <MedalRow
                  key={entry.id}
                  rank={rank}
                  fallbackClassName={`rounded-xl ${isMe ? "bg-brand-green/20 ring-2 ring-brand-green" : "bg-brand-dark-2"}`}
                  className={`animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ${isMe && medal ? "ring-2 ring-brand-green" : ""}`}
                >
                  <div
                    className="flex items-center gap-3 p-4"
                    style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
                  >
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
                      {tab === "overall" && entry.branch_name_ar && (
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
            })
          ) : (
            <p className="text-sm text-brand-surface-2">لا يوجد طلاب بعد</p>
          )}
        </div>
      </div>
    </main>
  );
}
