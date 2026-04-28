import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, BarChart3, Cpu, Monitor } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";
import { fetchAgentDeviceList, fetchAgentFleetStats } from "@/features/agents/application/queries";
import { AgentDevicesPanel } from "@/features/agents/interface/devices-panel";
import { getRemoteEfficiencyMetrics } from "@/features/remote/application/report-queries";
import { getRemotePlatformDirectory } from "@/features/remote/application/queries";
import { getRemoteSessions } from "@/features/remote/application/session-queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import type { RemoteSessionStatus } from "@/features/remote/domain/model";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { RemoteEfficiencyReportsPanel } from "@/features/remote/interface/reports-panel";
import { RemoteSessionsPanel } from "@/features/remote/interface/sessions-panel";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InfrastructureTab = "hosts" | "sessoes" | "relatorios" | "agentes";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

function parseAgentStatus(value: string): "all" | "online" | "offline" {
  return value === "online" || value === "offline" ? value : "all";
}

function parseSessionStatus(value: string): RemoteSessionStatus | "ACTIVE" | undefined {
  const normalized = value.toUpperCase();
  return normalized === "ACTIVE" ||
    normalized === "REQUESTED" ||
    normalized === "STARTED" ||
    normalized === "ENDED" ||
    normalized === "FAILED" ||
    normalized === "CANCELLED"
    ? normalized
    : undefined;
}

function buildTabHref(tab: InfrastructureTab, params: Record<string, string>) {
  const next = new URLSearchParams({ tab });
  if (tab === "hosts") {
    if (params.companyId) next.set("companyId", params.companyId);
    if (params.ticketNumber) next.set("ticketNumber", params.ticketNumber);
  }
  if (tab === "sessoes") {
    if (params.status) next.set("status", params.status);
    if (params.host) next.set("host", params.host);
    if (params.ticket) next.set("ticket", params.ticket);
  }
  if (tab === "agentes") {
    if (params.search) next.set("search", params.search);
    if (params.status) next.set("status", params.status);
  }
  return `/portal/infraestrutura?${next.toString()}`;
}

const TAB_META: Record<
  InfrastructureTab,
  { label: string; description: string; icon: typeof Monitor }
> = {
  hosts: {
    label: "Hosts",
    description: "Diretorio operacional dos hosts remotos vinculados as empresas.",
    icon: Monitor,
  },
  sessoes: {
    label: "Sessoes",
    description: "Auditoria centralizada das conexoes remotas e historico tecnico.",
    icon: Activity,
  },
  relatorios: {
    label: "Relatorios",
    description: "Indicadores de eficiencia do suporte remoto.",
    icon: BarChart3,
  },
  agentes: {
    label: "Agentes",
    description: "Frota de devices com heartbeat, versao e vinculo operacional.",
    icon: Cpu,
  },
};

export default async function InfraestruturaPage({ searchParams }: PageProps) {
  await requireSession();

  const canRemote = await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
    acceptCompanyScope: true,
  });
  const canHosts = canRemote;
  const canSessions = canRemote;
  const canReports = canRemote;
  const canAgents = await currentUserHasAnyPermission(["agents:view", "agents:manage"], {
    acceptCompanyScope: true,
  });

  const availableTabs = ([
    canHosts && "hosts",
    canSessions && "sessoes",
    canReports && "relatorios",
    canAgents && "agentes",
  ].filter(Boolean) as InfrastructureTab[]);

  if (availableTabs.length === 0) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedTab = readParam(params?.tab) as InfrastructureTab;
  const activeTab = availableTabs.includes(requestedTab) ? requestedTab : availableTabs[0];

  const tabParams = {
    companyId: readParam(params?.companyId),
    ticketNumber: readParam(params?.ticketNumber),
    status: readParam(params?.status),
    host: readParam(params?.host),
    ticket: readParam(params?.ticket),
    search: readParam(params?.search),
  };

  if (requestedTab && requestedTab !== activeTab) {
    redirect(buildTabHref(activeTab, tabParams));
  }

  let content: ReactNode = null;

  if (activeTab === "hosts") {
    const tenantScope = await getRemoteTenantScope();
    const directory = await getRemotePlatformDirectory(tenantScope);
    content = (
      <RemotePlatformDirectoryPanel
        directory={directory}
        initialCompanyId={tabParams.companyId || undefined}
        initialTicketNumber={tabParams.ticketNumber || undefined}
      />
    );
  }

  if (activeTab === "sessoes") {
    const tenantScope = await getRemoteTenantScope();
    const pageValue = Math.max(1, Number(readParam(params?.page)) || 1);
    const statusFilter = parseSessionStatus(tabParams.status);
    const { sessions, pagination, hostOptions } = await getRemoteSessions(tenantScope, {
      status: statusFilter,
      hostId: tabParams.host || undefined,
      ticket: tabParams.ticket || undefined,
      page: pageValue,
      pageSize: 50,
    });

    content = (
      <RemoteSessionsPanel
        sessions={sessions}
        pagination={pagination}
        hostOptions={hostOptions}
        filters={{
          status: statusFilter ?? "ALL",
          hostId: tabParams.host,
          ticket: tabParams.ticket,
        }}
      />
    );
  }

  if (activeTab === "relatorios") {
    const tenantScope = await getRemoteTenantScope();
    const metrics = await getRemoteEfficiencyMetrics(tenantScope);
    content = <RemoteEfficiencyReportsPanel metrics={metrics} />;
  }

  if (activeTab === "agentes") {
    const pageValue = Math.max(1, Number(readParam(params?.page)) || 1);
    const search = tabParams.search;
    const status = parseAgentStatus(tabParams.status);
    const [stats, list] = await Promise.all([
      fetchAgentFleetStats(),
      fetchAgentDeviceList({ page: pageValue, search: search || undefined, status }),
    ]);

    content = (
      <AgentDevicesPanel
        initialStats={stats}
        initialList={list}
        initialSearch={search}
        initialStatus={status}
      />
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 pb-8 duration-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Infraestrutura</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Centralize hosts, sessoes remotas, relatorios operacionais e agentes em uma unica rota.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max rounded-md bg-muted/40 p-1">
              {availableTabs.map((tab) => {
                const meta = TAB_META[tab];
                const Icon = meta.icon;
                const href = buildTabHref(tab, tabParams);
                const isActive = activeTab === tab;
                return (
                  <Link
                    key={tab}
                    href={href}
                    className={cn(
                      "inline-flex h-8 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {meta.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <p className="px-1 text-sm text-muted-foreground">{TAB_META[activeTab].description}</p>
        </div>
      </section>

      {content}
    </div>
  );
}
