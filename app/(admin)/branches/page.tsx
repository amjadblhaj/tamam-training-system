import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getBranchesWithStats } from "./actions";
import { BranchesClient } from "./BranchesClient";

export default async function BranchesPage() {
  const session = await getSession();
  if (!session || session.role === "student") {
    redirect("/login");
  }

  const data = await getBranchesWithStats();
  return <BranchesClient initialData={data} role={session.role} />;
}
