import { getBranchLeaderboardLinks, getOverallLeaderboardLink } from "./actions";
import { LeaderboardsClient } from "./LeaderboardsClient";

export default async function LeaderboardsPage() {
  const [branchLinks, overallLink] = await Promise.all([
    getBranchLeaderboardLinks(),
    getOverallLeaderboardLink(),
  ]);

  return <LeaderboardsClient initialBranchLinks={branchLinks} initialOverallLink={overallLink} />;
}
