import { getBranches } from "@/lib/actions/branches";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const branches = await getBranches();
  return <DashboardClient branches={branches} />;
}
