import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getRemoteHostDetails } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { fetchLinkedAgentDevice } from "@/features/agents/application/agent.queries";
import { RemoteHostDetailsPanel } from "@/features/remote/interface/host-details-page";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export default async function InfrastructureHostDetailsPage({
  params,
}: {
  params: Promise<{ hostId: string }>;
}) {
  await requireSession();
  const canAccess =
    (await currentUserHasPermission("tools:all")) ||
    ((await currentUserHasPermission("tools:basic")) &&
      (await currentUserHasPermission("companies:view", { acceptCompanyScope: true })));
  if (!canAccess) {
    redirect("/portal");
  }

  const { hostId } = await params;
  const tenantScope = await getRemoteTenantScope();

  const [details, linkedDevice] = await Promise.all([
    getRemoteHostDetails(tenantScope, hostId),
    fetchLinkedAgentDevice(hostId).catch(() => null),
  ]);

  if (!details) {
    notFound();
  }

  return <RemoteHostDetailsPanel details={details} linkedDevice={linkedDevice} />;
}
