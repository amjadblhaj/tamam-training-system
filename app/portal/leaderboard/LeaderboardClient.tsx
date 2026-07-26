"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
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
            board.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex animate-in items-center gap-3 rounded-xl fade-in-0 slide-in-from-bottom-1 p-4 duration-300 ${
                  entry.id === studentId ? "bg-brand-green/20 ring-2 ring-brand-green" : "bg-brand-dark-2"
                }`}
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-dark text-sm font-bold text-brand-orange">
                  {index === 0 ? <Trophy size={16} className="text-brand-orange" /> : index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-brand-surface">{entry.full_name}</p>
                  {tab === "overall" && entry.branch_name_ar && (
                    <p className="text-xs text-brand-surface-2">{entry.branch_name_ar}</p>
                  )}
                </div>
                <p className="font-bold text-brand-orange">{entry.points}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-brand-surface-2">لا يوجد طلاب بعد</p>
          )}
        </div>
      </div>
    </main>
  );
}
