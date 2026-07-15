import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Cpu, Monitor, Plus } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader, PageShell } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { fetchAgentDeviceList, fetchAgentFleetStats } from "@/features/agents/application/agent.queries";
import { AgentDevicesPanel } from "@/features/agents/interface/devices-panel";
import { getRemoteEfficiencyMetrics } from "@/features/remote/application/report-queries";
import { getRemotePlatformDirectory } from "@/features/remote/application/remote-platform.queries";
import { getRemoteSessions } from "@/features/remote/application/session-queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import type { RemoteSessionStatus } from "@/features/remote/domain/remote-host.types";
import { RemotePlatformDirectoryPanel } from "@/features/remote/interface/directory-page";
import { RemoteSessionsPanel } from "@/features/remote/interface/sessions-panel";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InfrastructureTab = "hosts" | "operacao" | "agentes";
type LegacyInfrastructureTab = InfrastructureTab | "sessoes" | "relatorios";
type OperationsView = "todas" | "ativas" | "historico" | "eficiencia";

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

function parseOperationsView(value: string): OperationsView {
  return value === "todas" || value === "historico" || value === "eficiencia" ? value : "ativas";
}

function normalizeInfrastructureTab(tab: string, view: string): { tab: InfrastructureTab; view: OperationsView } {
  if (tab === "sessoes") {
    return { tab: "operacao", view: parseOperationsView(view || "ativas") };
  }
  if (tab === "relatorios") {
    return { tab: "operacao", view: "eficiencia" };
  }
  if (tab === "operacao") {
    return { tab: "operacao", view: parseOperationsView(view) };
  }
  if (tab === "agentes") {
    return { tab: "agentes", view: parseOperationsView(view) };
  }
  return { tab: "hosts", view: parseOperationsView(view) };
}

function buildTabHref(tab: InfrastructureTab, params: Record<string, string>) {
  const next = new URLSearchParams({ tab });
  if (tab === "hosts") {
    if (params.companyId) next.set("companyId", params.companyId);
    if (params.ticketNumber) next.set("ticketNumber", params.ticketNumber);
  }
  if (tab === "operacao") {
    next.set("view", parseOperationsView(params.view));
    if (params.status) next.set("status", params.status);
    if (params.host) next.set("host", params.host);
    if (params.ticket) next.set("ticket", params.ticket);
    if (params.page) next.set("page", params.page);
  }
  if (tab === "agentes") {
    if (params.search) next.set("search", params.search);
    if (params.status) next.set("status", params.status);
    if (params.page) next.set("page", params.page);
  }
  return `/portal/infraestrutura?${next.toString()}`;
}

const TAB_META: Record<InfrastructureTab, { label: string; icon: typeof Monitor }> = {
  hosts: {
    label: "Hosts",
    icon: Monitor,
  },
  operacao: {
    label: "Operação",
    icon: Activity,
  },
  agentes: {
    label: "Agentes",
    icon: Cpu,
  },
};

export default async function InfraestruturaPage({ searchParams }: PageProps) {
  await requireSession();

  const canRemote = await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
    acceptCompanyScope: true,
  });
  const canHosts = canRemote;
  const canOperations = canRemote;
  const canAgents = await currentUserHasAnyPermission(["agents:view", "agents:manage"], {
    acceptCompanyScope: true,
  });

  const availableTabs = ([canHosts && "hosts", canOperations && "operacao", canAgents && "agentes"].filter(
    Boolean,
  ) as InfrastructureTab[]);

  if (availableTabs.length === 0) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedTab = readParam(params?.tab) as LegacyInfrastructureTab;
  const tabParams = {
    companyId: readParam(params?.companyId),
    ticketNumber: readParam(params?.ticketNumber),
    status: readParam(params?.status),
    host: readParam(params?.host),
    ticket: readParam(params?.ticket),
    search: readParam(params?.search),
    view: readParam(params?.view),
    page: readParam(params?.page),
  };

  const normalized = normalizeInfrastructureTab(requestedTab, tabParams.view);
  const activeTab = availableTabs.includes(normalized.tab) ? normalized.tab : availableTabs[0];
  const operationsView = activeTab === "operacao" ? normalized.view : parseOperationsView(tabParams.view);

  if (
    requestedTab &&
    (requestedTab !== activeTab || normalized.tab !== activeTab || (activeTab === "operacao" && tabParams.view !== operationsView))
  ) {
    redirect(
      buildTabHref(activeTab, {
        ...tabParams,
        view: activeTab === "operacao" ? operationsView : tabParams.view,
      }),
    );
  }

  let content: ReactNode = null;
  let actions: ReactNode = null;

  if (activeTab === "hosts") {
    const tenantScope = await getRemoteTenantScope();
    const directory = await getRemotePlatformDirectory(tenantScope);
    const canManageRemote = await currentUserHasAnyPermission(["remote:manage", "tools:all"], {
      acceptCompanyScope: true,
    });
    if (canManageRemote) {
      actions = (
        <Button asChild size="sm" className="h-9 gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-200">
          <Link href="?tab=hosts&newHost=true">
            <Plus className="h-4 w-4" />
            Novo host
          </Link>
        </Button>
      );
    }
    content = (
      <RemotePlatformDirectoryPanel
        directory={directory}
        initialCompanyId={tabParams.companyId || undefined}
        initialTicketNumber={tabParams.ticketNumber || undefined}
        canManageRemote={canManageRemote}
      />
    );
  }

  if (activeTab === "operacao") {
    const tenantScope = await getRemoteTenantScope();
    const pageValue = Math.max(1, Number(readParam(params?.page)) || 1);
    const statusFilter = operationsView === "ativas" ? "ACTIVE" : parseSessionStatus(tabParams.status);
    const [sessionsResult, metrics] = await Promise.all([
      operationsView === "eficiencia"
        ? Promise.resolve({
            sessions: [],
            pagination: {
              page: 1,
              pageSize: 50,
              total: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false,
            },
            hostOptions: [] as Array<{ id: string; name: string }>,
          })
        : getRemoteSessions(tenantScope, {
            status: statusFilter,
            hostId: tabParams.host || undefined,
            ticket: tabParams.ticket || undefined,
            page: pageValue,
            pageSize: 50,
          }),
      operationsView === "eficiencia" ? getRemoteEfficiencyMetrics(tenantScope) : Promise.resolve(null),
    ]);

    content = (
      <RemoteSessionsPanel
        sessions={sessionsResult.sessions}
        pagination={sessionsResult.pagination}
        hostOptions={sessionsResult.hostOptions}
        view={operationsView}
        metrics={metrics ?? undefined}
        filters={{
          status: statusFilter ?? "ALL",
          hostId: tabParams.host,
          ticket: tabParams.ticket,
        }}
      />
    );
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
      />
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Infraestrutura"
        description="Centralize hosts, operacao remota e agentes em uma unica visao."
        actions={actions}
      />

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max rounded-md bg-muted/40 p-1">
            {availableTabs.map((tab) => {
              const meta = TAB_META[tab];
              const Icon = meta.icon;
              const href = buildTabHref(tab, {
                ...tabParams,
                view: tab === "operacao" ? operationsView : tabParams.view,
              });
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
      </section>

      {content}
    </PageShell>
  );
}
