import { notFound } from "next/navigation";
import { getTenantDetail } from "@/lib/actions/super-admin-tenants";
import { TenantDetailClient } from "./TenantDetailClient";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantDetail(params.id);
  if (!tenant) notFound();
  return <TenantDetailClient tenant={tenant} />;
}
