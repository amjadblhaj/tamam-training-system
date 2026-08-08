"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { MedalRow, MedalCrown, getMedalStyle } from "@/components/leaderboard/MedalRow";
import { getBranchLeaderboard } from "../actions";
import type { LeaderboardEntry } from "@/types";

export function LeaderboardClient({
  studentId,
  branchName,
  initialBranchBoard,
}: {
  studentId: number;
  branchName: string | null;
  initialBranchBoard: LeaderboardEntry[];
}) {
  // Students only ever see their own branch — no all-branches tab, no branch picker.
  const { data: board = initialBranchBoard } = useQuery({
    queryKey: ["portal-leaderboard-branch"],
    queryFn: () => getBranchLeaderboard(),
    initialData: initialBranchBoard,
  });

  return (
    <main className="min-h-screen bg-brand-dark px-4 py-8 text-brand-surface">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/portal" className="text-brand-surface" aria-label="رجوع">
            <ArrowRight size={20} />
          </Link>
          <Image src="/logo-full.png" alt="تمام" width={120} height={44} className="h-11 w-auto" priority />
        </div>

        <h1 className="mb-6 text-xl font-bold text-brand-green">
          {branchName ? `المتصدرون — ${branchName}` : "لوحة المتصدرين"}
        </h1>

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
                    <p className={`flex-1 font-semibold ${medal ? "text-brand-dark" : "text-brand-surface"}`}>
                      {entry.full_name}
                    </p>
                    <MedalCrown rank={rank} size={20} />
                    <p className={`font-bold ${medal ? "text-brand-text" : "text-brand-orange"}`}>{entry.points}</p>
                  </div>
                </MedalRow>
              );
            })
          ) : (
            <p className="text-sm text-brand-surface">لا يوجد طلاب بعد</p>
          )}
        </div>
      </div>
    </main>
  );
}
