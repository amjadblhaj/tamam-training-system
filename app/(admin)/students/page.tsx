import { getBranches } from "@/lib/actions/branches";
import { StudentsClient } from "./StudentsClient";

export default async function StudentsPage() {
  const branches = await getBranches();
  return <StudentsClient branches={branches} />;
}
