import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getBranchLeaderboard, getOverallLeaderboard } from "../actions";
import { LeaderboardClient } from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/login");
  }

  const [branchBoard, overallBoard] = await Promise.all([getBranchLeaderboard(), getOverallLeaderboard()]);

  return (
    <LeaderboardClient
      studentId={Number(session.id)}
      initialBranchBoard={branchBoard}
      initialOverallBoard={overallBoard}
    />
  );
}
