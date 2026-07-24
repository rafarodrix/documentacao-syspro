import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemoteDiscoveredHostDetails } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { RemoteDiscoveredHostDetailsPanel } from "@/features/remote/interface/discovered-host-details-page";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

export default async function InfrastructureDiscoveredHostDetailsPage({
  params,
}: {
  params: Promise<{ discoveredHostId: string }>;
}) {
  await requireSession();
  const canAccess = await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
    acceptCompanyScope: true,
  });
  if (!canAccess) {
    redirect("/portal");
  }

  const { discoveredHostId } = await params;
  const tenantScope = await getRemoteTenantScope();
  const details = await getRemoteDiscoveredHostDetails(tenantScope, discoveredHostId);

  if (!details) {
    notFound();
  }

  return <RemoteDiscoveredHostDetailsPanel details={details} />;
}
