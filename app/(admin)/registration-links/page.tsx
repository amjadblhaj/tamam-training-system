import { getBranchRegistrationLinks } from "./actions";
import { RegistrationLinksClient } from "./RegistrationLinksClient";

export default async function RegistrationLinksPage() {
  const links = await getBranchRegistrationLinks();
  return <RegistrationLinksClient initialData={links} />;
}
