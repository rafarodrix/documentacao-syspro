import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { fetchAgentInstallation } from "@/features/agents/application/agent.queries";
import { AgentInstallationDetailPanel } from "@/features/agents/interface/installation-detail-page";
import { getRemotePlatformDirectory } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

function normalizeMachineName(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

export default async function AgentInstallationDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  await requireSession();

  const canAccess = await currentUserHasAnyPermission(["agents:view", "agents:manage"], {
    acceptCompanyScope: true,
  });
  if (!canAccess) {
    redirect("/portal");
  }

  const canManage = await currentUserHasAnyPermission(["agents:manage"], {
    acceptCompanyScope: true,
  });
  const canManageRemote = await currentUserHasAnyPermission(["remote:manage", "tools:all"], {
    acceptCompanyScope: true,
  });

  const { deviceId } = await params;

  let device;
  try {
    device = await fetchAgentInstallation(decodeURIComponent(deviceId));
  } catch {
    notFound();
  }

  const tenantScope = await getRemoteTenantScope();
  const remoteDirectory = await getRemotePlatformDirectory(tenantScope).catch(() => null);
  const matchedPendingHost =
    device.hostname && remoteDirectory
      ? remoteDirectory.pendingItems
          .filter((item) => normalizeMachineName(item.machineName) === normalizeMachineName(device.hostname))
          .sort((a, b) => {
            const timeA = a.lastHeartbeatAt ? new Date(a.lastHeartbeatAt).getTime() : 0;
            const timeB = b.lastHeartbeatAt ? new Date(b.lastHeartbeatAt).getTime() : 0;
            return timeB - timeA;
          })[0] ?? null
      : null;

  return (
    <AgentInstallationDetailPanel
      device={device}
      canManage={canManage}
      canManageRemote={canManageRemote}
      companyOptions={remoteDirectory?.companyOptions ?? []}
      matchedPendingHost={
        matchedPendingHost
          ? {
              id: matchedPendingHost.id,
              machineName: matchedPendingHost.machineName,
            }
          : null
      }
    />
  );
}
