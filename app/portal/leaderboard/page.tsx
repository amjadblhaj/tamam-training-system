import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getBranchLeaderboard, getPortalBranchName } from "../actions";
import { LeaderboardClient } from "./LeaderboardClient";

export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session || session.role !== "student") {
    redirect("/login");
  }

  const [branchBoard, branchName] = await Promise.all([getBranchLeaderboard(), getPortalBranchName()]);

  return (
    <LeaderboardClient
      studentId={Number(session.id)}
      branchName={branchName}
      initialBranchBoard={branchBoard}
    />
  );
}
