import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { fetchAgentDevice } from "@/features/agents/application/agent.queries";
import { AgentDeviceDetailPanel } from "@/features/agents/interface/device-detail-page";

export default async function AgentDeviceDetailPage({
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

  const { deviceId } = await params;

  let device;
  try {
    device = await fetchAgentDevice(decodeURIComponent(deviceId));
  } catch {
    notFound();
  }

  return <AgentDeviceDetailPanel device={device} />;
}
