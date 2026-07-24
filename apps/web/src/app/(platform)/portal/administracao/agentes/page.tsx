import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader, PageShell } from "@/components/patterns";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { fetchAgentInstallationList, fetchAgentFleetStats } from "@/features/agents/application/agent.queries";
import { AgentDevicesPanel } from "@/features/agents/interface/devices-panel";
import { getRemoteModuleSettingsAction } from "@/features/remote/application/module-settings-actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function parseAgentStatus(value: string): "all" | "online" | "offline" {
  return value === "online" || value === "offline" ? value : "all";
}

export default async function AgentesPage({ searchParams }: PageProps) {
  await requireSession();

  const canAgents = await currentUserHasAnyPermission(["agents:view", "agents:manage"], {
    acceptCompanyScope: true,
  });

  if (!canAgents) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const pageValue = Math.max(1, Number(readParam(params?.page)) || 1);
  const search = readParam(params?.search);
  const status = parseAgentStatus(readParam(params?.status));

  const [stats, list] = await Promise.all([
    fetchAgentFleetStats(),
    fetchAgentInstallationList({ page: pageValue, search: search || undefined, status }),
  ]);

  const moduleSettingsResult = await getRemoteModuleSettingsAction().catch(() => ({
    success: false as const,
    error: "unavailable",
  }));
  const agentTargetVersion =
    moduleSettingsResult.success && "data" in moduleSettingsResult && moduleSettingsResult.data
      ? moduleSettingsResult.data.agentTargetVersion?.trim() || null
      : null;
  const agentAutoUpgrade =
    moduleSettingsResult.success && "data" in moduleSettingsResult && moduleSettingsResult.data
      ? Boolean(moduleSettingsResult.data.agentAutoUpgrade)
      : false;

  return (
    <PageShell>
      <PageHeader
        title="Frota de agentes"
        description="Visão administrativa técnica de todas as instalações do agente."
      />

      <AgentDevicesPanel
        initialStats={stats}
        initialList={list}
        initialSearch={search}
        agentTargetVersion={agentTargetVersion}
        agentAutoUpgrade={agentAutoUpgrade}
      />
    </PageShell>
  );
}
