import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { fetchAgentDeviceList, fetchAgentFleetStats } from "@/features/agents/application/queries";
import { AgentDevicesPanel } from "@/features/agents/interface/devices-panel";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function parseStatus(value: string): "all" | "online" | "offline" {
  return value === "online" || value === "offline" ? value : "all";
}

export default async function DispositivosPage({ searchParams }: PageProps) {
  await requireSession();

  const canView = await currentUserHasPermission("agents:view", { acceptCompanyScope: true });
  if (!canView) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const search = readParam(params?.search);
  const status = parseStatus(readParam(params?.status));
  const page = Math.max(1, Number(readParam(params?.page)) || 1);

  const [stats, list] = await Promise.all([
    fetchAgentFleetStats(),
    fetchAgentDeviceList({ page, search: search || undefined, status }),
  ]);

  const isGlobalView = await currentUserHasPermission("agents:view");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Dispositivos"
        description="Visualize a frota de agentes Trilink instalados, status de conexao e vinculo com empresas."
        isGlobalView={isGlobalView}
      />
      <AgentDevicesPanel
        initialStats={stats}
        initialList={list}
        initialSearch={search}
        initialStatus={status}
      />
    </div>
  );
}
