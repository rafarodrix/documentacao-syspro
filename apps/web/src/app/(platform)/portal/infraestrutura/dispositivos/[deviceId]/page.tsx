import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { PageShell } from "@/components/patterns";
import { getRemoteHostDetails } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { fetchLinkedAgentInstallation } from "@/features/agents/application/agent.queries";
import { RemoteHostDetailsPanel } from "@/features/remote/interface/host-details-page";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

export default async function InfrastructureHostDetailsPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  await requireSession();
  const canAccess = await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
    acceptCompanyScope: true,
  });
  if (!canAccess) {
    redirect("/portal");
  }

  const { deviceId } = await params;
  const tenantScope = await getRemoteTenantScope();

  const [details, linkedDevice] = await Promise.all([
    getRemoteHostDetails(tenantScope, deviceId),
    fetchLinkedAgentInstallation(deviceId).catch(() => null),
  ]);

  if (!details) {
    notFound();
  }

  return (
    <PageShell>
      <RemoteHostDetailsPanel details={details} linkedDevice={linkedDevice} />
    </PageShell>
  );
}
