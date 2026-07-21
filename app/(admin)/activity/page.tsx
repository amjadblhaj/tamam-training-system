import { getBranches } from "@/lib/actions/branches";
import { getSession } from "@/lib/auth/get-session";
import { ActivityClient } from "./ActivityClient";

export default async function ActivityPage() {
  const [branches, session] = await Promise.all([getBranches(), getSession()]);
  return <ActivityClient branches={branches} isAdmin={session?.role === "admin"} />;
}
