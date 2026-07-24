import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Activity, Monitor, Plus } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { requireSession } from "@/lib/auth-helpers";
import { PageHeader, PageShell } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { getRemoteSessions } from "@/features/remote/application/session-queries";
import { searchRemoteCompanies } from "@/features/remote/application/remote-platform.queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import type { RemoteSessionStatus } from "@/features/remote/domain/remote-host.types";
import { parseOperationsView, type OperationsView } from "@/features/remote/interface/operations-view";
import { RemoteSessionsPanel } from "@/features/remote/interface/sessions-panel";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { DeviceListPage } from "@/features/infrastructure/device/components/device-list-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type InfrastructureTab = "dispositivos" | "operacao" | "relatorios";
type LegacyInfrastructureTab = InfrastructureTab | "sessoes" | "hosts" | "agentes";

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
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

function normalizeInfrastructureTab(tab: string, view: string): { tab: InfrastructureTab; view?: OperationsView } {
  if (tab === "sessoes") {
    return { tab: "operacao", view: parseOperationsView(view || "em_andamento") };
  }
  if (tab === "operacao") {
    return { tab: "operacao", view: parseOperationsView(view) };
  }
  if (tab === "relatorios") {
    return { tab: "relatorios" };
  }
  return { tab: "dispositivos", view: parseOperationsView(view) };
}

function buildTabHref(tab: InfrastructureTab, params: Record<string, string>) {
  const next = new URLSearchParams({ tab });
  if (tab === "dispositivos") {
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
  if (tab === "relatorios") {
    // TBD: parameters for reports
  }
  return `/portal/infraestrutura?${next.toString()}`;
}

const TAB_META: Record<InfrastructureTab, { label: string; icon: typeof Monitor }> = {
  dispositivos: {
    label: "Dispositivos",
    icon: Monitor,
  },
  operacao: {
    label: "Operações",
    icon: Activity,
  },
  relatorios: {
    label: "Relatórios e auditoria",
    icon: Activity, // Replace with appropriate icon if available, using Activity as fallback
  },
};

export default async function InfraestruturaPage({ searchParams }: PageProps) {
  await requireSession();

  const canRemote = await currentUserHasAnyPermission(["remote:view", "remote:manage"], {
    acceptCompanyScope: true,
  });
  const canHosts = canRemote;
  const canOperations = canRemote;
  const canReports = canRemote;

  const availableTabs = ([canHosts && "dispositivos", canOperations && "operacao", canReports && "relatorios"].filter(
    Boolean,
  ) as InfrastructureTab[]);

  if (availableTabs.length === 0) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const requestedTab = readParam(params?.tab) as LegacyInfrastructureTab;

  if (requestedTab === "agentes") {
    redirect("/portal/administracao/agentes");
  }

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
  const fallbackOperationsView = parseOperationsView(tabParams.view);
  const operationsView: OperationsView =
    activeTab === "operacao" ? normalized.view ?? fallbackOperationsView : fallbackOperationsView;

  if (
    requestedTab &&
    (requestedTab !== activeTab || normalized.tab !== activeTab || (activeTab === "operacao" && tabParams.view !== operationsView))
  ) {
    redirect(
      buildTabHref(activeTab, {
        ...tabParams,
        view: activeTab === "operacao" ? operationsView : tabParams.view || "",
      }),
    );
  }

  let content: ReactNode = null;
  let actions: ReactNode = null;

  if (activeTab === "dispositivos") {
    const canManageRemote = await currentUserHasAnyPermission(["remote:manage", "tools:all"], {
      acceptCompanyScope: true,
    });
    const tenantScope = await getRemoteTenantScope();
    const companyOptions = canManageRemote
      ? await searchRemoteCompanies(tenantScope).catch(() => [])
      : [];

    if (canManageRemote) {
      actions = (
        <Button asChild size="sm" className="h-9 gap-1.5 shrink-0 animate-in fade-in zoom-in-95 duration-200">
          <Link href="?tab=dispositivos&newHost=true">
            <Plus className="h-4 w-4" />
            Adicionar dispositivo
          </Link>
        </Button>
      );
    }
    content = (
      <DeviceListPage
        initialCompanyId={tabParams.companyId || undefined}
        initialTicketNumber={tabParams.ticketNumber || undefined}
        canManageRemote={canManageRemote}
        companyOptions={companyOptions}
      />
    );
  }

  if (activeTab === "operacao") {
    const tenantScope = await getRemoteTenantScope();
    const pageValue = Math.max(1, Number(readParam(params?.page)) || 1);
    const statusFilter = 
      operationsView === "em_andamento" ? "ACTIVE" : 
      operationsView === "concluidas" ? "ENDED" : 
      operationsView === "falhas" ? "FAILED" : 
      operationsView === "requer_acao" ? "REQUESTED" : 
      parseSessionStatus(tabParams.status);
      
    const [sessionsResult, metrics] = await Promise.all([
      getRemoteSessions(tenantScope, {
        status: statusFilter,
        hostId: tabParams.host || undefined,
        ticket: tabParams.ticket || undefined,
        page: pageValue,
        pageSize: 50,
      }),
      Promise.resolve(null),
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

  if (activeTab === "relatorios") {
    content = (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
        Módulo de relatórios e auditoria em construção
      </div>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Infraestrutura"
        description="Centralize dispositivos, operacoes remotas e auditoria em uma unica visao."
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
                view: tab === "operacao" ? operationsView : tabParams.view || "",
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
