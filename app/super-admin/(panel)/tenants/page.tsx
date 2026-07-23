import { getTenants } from "@/lib/actions/super-admin-tenants";
import { TenantsClient } from "./TenantsClient";

export default async function SuperAdminTenantsPage() {
  const tenants = await getTenants();
  return <TenantsClient initialTenants={tenants} />;
}
