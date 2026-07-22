import { getBranches } from "@/lib/actions/branches";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const branches = await getBranches();
  return <SettingsClient branches={branches} />;
}
