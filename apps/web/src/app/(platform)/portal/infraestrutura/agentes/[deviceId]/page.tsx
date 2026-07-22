import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { fetchAgentInstallation } from "@/features/agents/application/agent.queries";
import { AgentInstallationDetailPanel } from "@/features/agents/interface/installation-detail-page";
import { searchRemoteCompanies } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { trpc } from "@/lib/api/trpc-client";
import type { DeviceListResponse } from "@dosc-syspro/contracts";

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
  const [companyOptions, discoveredResult] = await Promise.all([
    searchRemoteCompanies(tenantScope).catch(() => []),
    device.hostname
      ? (trpc.remote.devices.query({ lifecycle: "DISCOVERED", query: device.hostname }).catch(() => null) as Promise<DeviceListResponse | null>)
      : Promise.resolve(null),
  ]);

  const matchedDiscoveredItem = discoveredResult?.items.find(
    (item) => normalizeMachineName(item.hostname) === normalizeMachineName(device.hostname),
  );

  const matchedPendingHostForPanel = matchedDiscoveredItem
    ? {
        id: matchedDiscoveredItem.id,
        machineName: matchedDiscoveredItem.hostname,
        status: (matchedDiscoveredItem.statusLabel === "Bloqueado" ? "IGNORED" : "PENDING_LINK") as "IGNORED" | "PENDING_LINK",
      }
    : null;

  return (
    <AgentInstallationDetailPanel
      device={device}
      canManage={canManage}
      canManageRemote={canManageRemote}
      companyOptions={companyOptions}
      matchedPendingHost={matchedPendingHostForPanel}
    />
  );
}
