import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookCopy,
  Boxes,
  Building2,
  Cable,
  ClipboardList,
  HardDrive,
  MessageSquare,
  Pencil,
  PlusCircle,
  Server,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { CompanyCockpitAlertItem, CompanyCockpitRecommendationItem, CompanyCockpitViewData } from "@dosc-syspro/contracts/company";
import { Badge, Button } from "@dosc-syspro/ui";
import { EmptyState, MetricCard, PageHeader, PageShell, SectionCard } from "@/components/patterns";
import { formatDate as formatDateSafe, formatDateTimeSafe } from "@/lib/date";
import { formatCNPJ } from "@/lib/formatters";
import { getCompanySegmentLabel } from "@/features/company/domain/company-segments";

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part)).join(" | ");
}

function formatDateTime(value: string | null | undefined) {
  return formatDateTimeSafe(value, "Sem registro");
}

function formatDate(value: string | null | undefined) {
  return formatDateSafe(value, "Sem data");
}

function normalizeCompanyCockpitView(view: CompanyCockpitViewData): CompanyCockpitViewData {
  const profile = view?.profile ?? ({} as CompanyCockpitViewData["profile"]);
  const counts = profile.counts ?? ({} as CompanyCockpitViewData["profile"]["counts"]);
  const sla = view?.sla ?? ({} as CompanyCockpitViewData["sla"]);
  const health = view?.health ?? ({} as CompanyCockpitViewData["health"]);
  const monthlyRoutine = view?.monthlyRoutine ?? ({} as CompanyCockpitViewData["monthlyRoutine"]);

  return {
    profile: {
      companyId: typeof profile.companyId === "string" && profile.companyId.trim() ? profile.companyId : "unknown-company",
      displayName: typeof profile.displayName === "string" && profile.displayName.trim() ? profile.displayName : "Empresa",
      razaoSocial: typeof profile.razaoSocial === "string" && profile.razaoSocial.trim() ? profile.razaoSocial : "Empresa",
      nomeFantasia: typeof profile.nomeFantasia === "string" && profile.nomeFantasia.trim() ? profile.nomeFantasia : null,
      cnpj: typeof profile.cnpj === "string" ? profile.cnpj : "",
      status: profile.status ?? "ACTIVE",
      segment: profile.segment ?? null,
      regimeTributario: profile.regimeTributario ?? null,
      city: typeof profile.city === "string" && profile.city.trim() ? profile.city : null,
      state: typeof profile.state === "string" && profile.state.trim() ? profile.state : null,
      accountingFirmName: typeof profile.accountingFirmName === "string" && profile.accountingFirmName.trim() ? profile.accountingFirmName : null,
      blockedReasonLabel: typeof profile.blockedReasonLabel === "string" && profile.blockedReasonLabel.trim() ? profile.blockedReasonLabel : null,
      installationDirectory: typeof profile.installationDirectory === "string" && profile.installationDirectory.trim() ? profile.installationDirectory : null,
      serverHost: typeof profile.serverHost === "string" && profile.serverHost.trim() ? profile.serverHost : null,
      serverType: profile.serverType ?? null,
      serverProtocol: profile.serverProtocol ?? null,
      serverPort: typeof profile.serverPort === "number" && Number.isFinite(profile.serverPort) ? profile.serverPort : null,
      counts: {
        users: typeof counts.users === "number" && Number.isFinite(counts.users) ? counts.users : 0,
        contacts: typeof counts.contacts === "number" && Number.isFinite(counts.contacts) ? counts.contacts : 0,
        contracts: typeof counts.contracts === "number" && Number.isFinite(counts.contracts) ? counts.contracts : 0,
        remoteHosts: typeof counts.remoteHosts === "number" && Number.isFinite(counts.remoteHosts) ? counts.remoteHosts : 0,
        integrationConnections: typeof counts.integrationConnections === "number" && Number.isFinite(counts.integrationConnections) ? counts.integrationConnections : 0,
        conversationLinks: typeof counts.conversationLinks === "number" && Number.isFinite(counts.conversationLinks) ? counts.conversationLinks : 0,
        openTickets: typeof counts.openTickets === "number" && Number.isFinite(counts.openTickets) ? counts.openTickets : 0,
        openTasks: typeof counts.openTasks === "number" && Number.isFinite(counts.openTasks) ? counts.openTasks : 0,
      },
    },
    sla: {
      openTickets: typeof sla.openTickets === "number" && Number.isFinite(sla.openTickets) ? sla.openTickets : 0,
      responseOverdue: typeof sla.responseOverdue === "number" && Number.isFinite(sla.responseOverdue) ? sla.responseOverdue : 0,
      resolutionOverdue: typeof sla.resolutionOverdue === "number" && Number.isFinite(sla.resolutionOverdue) ? sla.resolutionOverdue : 0,
      responseDueSoon: typeof sla.responseDueSoon === "number" && Number.isFinite(sla.responseDueSoon) ? sla.responseDueSoon : 0,
      resolutionDueSoon: typeof sla.resolutionDueSoon === "number" && Number.isFinite(sla.resolutionDueSoon) ? sla.resolutionDueSoon : 0,
    },
    health: {
      score: typeof health.score === "number" && Number.isFinite(health.score) ? health.score : 0,
      status: health.status ?? "WATCH",
      label: typeof health.label === "string" && health.label.trim() ? health.label : "Sem diagnostico",
      summary: typeof health.summary === "string" && health.summary.trim() ? health.summary : "Os dados consolidados desta conta nao estao disponiveis no momento.",
    },
    alerts: Array.isArray(view?.alerts) ? view.alerts : [],
    recommendedActions: Array.isArray(view?.recommendedActions) ? view.recommendedActions : [],
    tickets: Array.isArray(view?.tickets) ? view.tickets : [],
    tasks: Array.isArray(view?.tasks) ? view.tasks : [],
    monthlyRoutine: {
      isConfigured: Boolean(monthlyRoutine.isConfigured),
      isActive: Boolean(monthlyRoutine.isActive),
      title: typeof monthlyRoutine.title === "string" && monthlyRoutine.title.trim() ? monthlyRoutine.title : null,
      dueDay: typeof monthlyRoutine.dueDay === "number" && Number.isFinite(monthlyRoutine.dueDay) ? monthlyRoutine.dueDay : null,
      reminderDays: typeof monthlyRoutine.reminderDays === "number" && Number.isFinite(monthlyRoutine.reminderDays) ? monthlyRoutine.reminderDays : null,
      pendingCount: typeof monthlyRoutine.pendingCount === "number" && Number.isFinite(monthlyRoutine.pendingCount) ? monthlyRoutine.pendingCount : 0,
      overdueCount: typeof monthlyRoutine.overdueCount === "number" && Number.isFinite(monthlyRoutine.overdueCount) ? monthlyRoutine.overdueCount : 0,
      waitingCustomerCount: typeof monthlyRoutine.waitingCustomerCount === "number" && Number.isFinite(monthlyRoutine.waitingCustomerCount) ? monthlyRoutine.waitingCustomerCount : 0,
      completedCount: typeof monthlyRoutine.completedCount === "number" && Number.isFinite(monthlyRoutine.completedCount) ? monthlyRoutine.completedCount : 0,
      latestItems: Array.isArray(monthlyRoutine.latestItems) ? monthlyRoutine.latestItems : [],
    },
    conversations: Array.isArray(view?.conversations) ? view.conversations : [],
    hosts: Array.isArray(view?.hosts) ? view.hosts : [],
    sessions: Array.isArray(view?.sessions) ? view.sessions : [],
    integrations: Array.isArray(view?.integrations) ? view.integrations : [],
    releases: Array.isArray(view?.releases) ? view.releases : [],
  };
}

function getStatusBadge(status: CompanyCockpitViewData["profile"]["status"]) {
  if (status === "ACTIVE") return { label: "Ativa", variant: "success" as const };
  if (status === "PENDING_DOCS") return { label: "Pendente", variant: "warning" as const };
  if (status === "SUSPENDED") return { label: "Suspensa", variant: "warning" as const };
  return { label: "Inativa", variant: "default" as const };
}

function getSlaTone(value: number) {
  if (value > 0) return "danger" as const;
  return "success" as const;
}

function getHealthTone(status: CompanyCockpitViewData["health"]["status"]) {
  if (status === "CRITICAL") return "danger" as const;
  if (status === "WATCH") return "warning" as const;
  return "success" as const;
}

function getHealthBadge(status: CompanyCockpitViewData["health"]["status"]) {
  if (status === "CRITICAL") return { label: "Critica", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" };
  if (status === "WATCH") return { label: "Atencao", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" };
  return { label: "Estavel", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
}

function getAlertBadge(severity: CompanyCockpitAlertItem["severity"]) {
  if (severity === "CRITICAL") return { label: "Critico", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" };
  if (severity === "WARNING") return { label: "Atencao", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" };
  return { label: "Info", className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300" };
}

function getRecommendationBadge(tone: CompanyCockpitRecommendationItem["tone"]) {
  if (tone === "danger") return { label: "Agora", className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300" };
  if (tone === "warning") return { label: "Prioridade", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300" };
  return { label: "Proximo passo", className: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300" };
}

function CompanyListRow({
  title,
  meta,
  href,
  tone,
}: {
  title: string;
  meta: string;
  href?: string | null;
  tone?: "default" | "warning";
}) {
  const isExternalHref = Boolean(href && /^https?:\/\//.test(href));
  const content = (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
      </div>
      {tone === "warning" ? (
        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
          Risco
        </Badge>
      ) : null}
    </div>
  );

  if (!href) return content;

  if (isExternalHref) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block transition-transform hover:-translate-y-0.5">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function PriorityRow({
  title,
  description,
  badgeLabel,
  badgeClassName,
  href,
  ctaLabel,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  badgeClassName: string;
  href?: string | null;
  ctaLabel?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/60 p-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <Badge variant="outline" className={badgeClassName}>
            {badgeLabel}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {href && ctaLabel ? (
        /^https?:\/\//.test(href) ? (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <a href={href} target="_blank" rel="noreferrer">{ctaLabel}</a>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={href}>{ctaLabel}</Link>
          </Button>
        )
      ) : null}
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  external = false,
}: {
  href: string;
  label: string;
  description: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <Button asChild variant="outline" className="h-auto justify-start rounded-xl px-4 py-3 text-left">
        <a href={href} target="_blank" rel="noreferrer">
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </a>
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" className="h-auto justify-start rounded-xl px-4 py-3 text-left">
      <Link href={href}>
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </Link>
    </Button>
  );
}

export function CompanyCockpitPage({
  view: rawView,
  backHref,
  canEdit,
  editHref,
}: {
  view: CompanyCockpitViewData;
  backHref: string;
  canEdit: boolean;
  editHref: string;
}) {
  const view = normalizeCompanyCockpitView(rawView);
  const statusBadge = getStatusBadge(view.profile.status);
  const healthBadge = getHealthBadge(view.health.status);
  const segmentLabel = view.profile.segment ? getCompanySegmentLabel(view.profile.segment) : "Sem segmento";
  const ticketsHref = `/portal/tickets?companyId=${view.profile.companyId}`;
  const newTicketHref = `/portal/tickets/novo?companyId=${view.profile.companyId}&customerCompany=${encodeURIComponent(view.profile.displayName)}`;
  const tasksHref = `/portal/tarefas?companyId=${view.profile.companyId}`;
  const newTaskHref = `${tasksHref}&newTask=true`;
  const monthlyTasksHref = `${tasksHref}&type=ROTINA_MENSAL`;
  const hostsHref = `/portal/infraestrutura?tab=hosts&companyId=${view.profile.companyId}`;
  const newHostHref = `${hostsHref}&newHost=true`;
  const latestConversationHref = view.conversations[0]?.chatwootUrl || "/portal/configuracoes?tab=integrations";
  const latestReleaseHref = view.releases[0] ? `/portal/tickets/${view.releases[0].ticketId}` : ticketsHref;
  const criticalAlerts = view.alerts.filter((item) => item.severity === "CRITICAL").length;
  const warningAlerts = view.alerts.filter((item) => item.severity === "WARNING").length;

  return (
    <PageShell>
      <PageHeader
        title={`${view.profile.displayName} 360`}
        description="Cockpit operacional da empresa com suporte, rotina mensal, atendimento, remoto e integracoes no mesmo contexto."
        badge={{
          label: statusBadge.label,
          variant: statusBadge.variant,
        }}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {canEdit ? (
              <Button asChild size="sm">
                <Link href={editHref}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar empresa
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard
          title="Contexto da Conta"
          description="Base cadastral e operacional usada para cruzar suporte, remoto e fiscal."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Razao social</p>
              <p className="mt-1 text-sm font-medium text-foreground">{view.profile.razaoSocial}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">CNPJ</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatCNPJ(view.profile.cnpj)}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Segmento</p>
              <p className="mt-1 text-sm font-medium text-foreground">{segmentLabel}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cidade</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {view.profile.city || "Nao informada"}
                {view.profile.state ? ` / ${view.profile.state}` : ""}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Contabilidade</p>
              <p className="mt-1 text-sm font-medium text-foreground">{view.profile.accountingFirmName || "Nao vinculada"}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Servidor</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {view.profile.serverHost || "Nao configurado"}
                {view.profile.serverPort ? `:${view.profile.serverPort}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(view.profile.serverType || "sem tipo")} / {(view.profile.serverProtocol || "sem protocolo")}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Saude da Conta"
          description="Leitura resumida para entender se a conta pede atuacao imediata ou manutencao."
        >
          <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Health score</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">{view.health.score}</p>
              </div>
              <Badge variant="outline" className={healthBadge.className}>
                {healthBadge.label}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{view.health.summary}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Alertas criticos</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{criticalAlerts}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Alertas de atencao</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{warningAlerts}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/50 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Proximo melhor passo</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {view.recommendedActions[0]?.title || "Sem proxima acao priorizada no momento."}
            </p>
            {view.recommendedActions[0] ? (
              /^https?:\/\//.test(view.recommendedActions[0].href) ? (
                <Button asChild size="sm" className="mt-3">
                  <a href={view.recommendedActions[0].href} target="_blank" rel="noreferrer">
                    {view.recommendedActions[0].ctaLabel}
                  </a>
                </Button>
              ) : (
                <Button asChild size="sm" className="mt-3">
                  <Link href={view.recommendedActions[0].href}>{view.recommendedActions[0].ctaLabel}</Link>
                </Button>
              )
            ) : null}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Health score"
          value={view.health.score}
          description={view.health.label}
          icon={ShieldAlert}
          tone={getHealthTone(view.health.status)}
        />
        <MetricCard
          title="Tickets abertos"
          value={view.profile.counts.openTickets}
          description={`${view.sla.responseOverdue} resposta(s) vencida(s) e ${view.sla.resolutionOverdue} resolucao(oes) vencida(s)`}
          icon={MessageSquare}
          tone={getSlaTone(view.sla.responseOverdue + view.sla.resolutionOverdue)}
        />
        <MetricCard
          title="Tarefas abertas"
          value={view.profile.counts.openTasks}
          description={`${view.monthlyRoutine.overdueCount} rotina(s) atrasada(s) e ${view.monthlyRoutine.waitingCustomerCount} aguardando cliente`}
          icon={ClipboardList}
          tone={view.monthlyRoutine.overdueCount > 0 ? "warning" : "info"}
        />
        <MetricCard
          title="Hosts remotos"
          value={view.profile.counts.remoteHosts}
          description={`${view.sessions.length} sessoes recentes carregadas neste cockpit`}
          icon={Server}
          tone="neutral"
        />
        <MetricCard
          title="Integracoes"
          value={view.profile.counts.integrationConnections}
          description={`${view.profile.counts.conversationLinks} conversa(s) vinculada(s) localmente`}
          icon={Cable}
          tone="neutral"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
        <SectionCard
          title="Acoes Rapidas"
          description="Atalhos para agir na conta sem perder contexto."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAction href={newTicketHref} label="Novo ticket" description="Abrir chamado ja contextualizado na empresa." />
            <QuickAction href={newTaskHref} label="Nova tarefa" description="Criar backlog operacional ja preso na conta." />
            <QuickAction href={newHostHref} label="Novo host" description="Cadastrar host manual com empresa preselecionada." />
            <QuickAction
              href={latestConversationHref}
              label="Abrir conversa"
              description="Voltar para o atendimento mais recente ou revisar integracoes."
              external={Boolean(view.conversations[0]?.chatwootUrl)}
            />
            <QuickAction href={hostsHref} label="Infraestrutura" description="Ver hosts, sessoes e sinais de degradacao remota." />
            <QuickAction href={latestReleaseHref} label="Releases" description="Abrir a release mais recente ou revisar tickets publicados." />
          </div>
        </SectionCard>

        <SectionCard
          title="Prioridades Agora"
          description="Alertas priorizados e recomendacoes para orientar a operacao."
        >
          <div className="space-y-3">
            {view.alerts.map((alert) => {
              const badge = getAlertBadge(alert.severity);
              return (
                <PriorityRow
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  badgeLabel={badge.label}
                  badgeClassName={badge.className}
                  href={alert.href}
                  ctaLabel={alert.ctaLabel}
                />
              );
            })}
            {view.recommendedActions.map((action) => {
              const badge = getRecommendationBadge(action.tone);
              return (
                <PriorityRow
                  key={action.id}
                  title={action.title}
                  description={action.description}
                  badgeLabel={badge.label}
                  badgeClassName={badge.className}
                  href={action.href}
                  ctaLabel={action.ctaLabel}
                />
              );
            })}
            {!view.alerts.length && !view.recommendedActions.length ? (
              <EmptyState
                icon={PlusCircle}
                title="Sem prioridades abertas"
                description="A conta esta estavel. Use as acoes rapidas para registrar o proximo movimento operacional."
                dashed
              />
            ) : null}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Tickets e SLA"
          description="Chamados mais recentes desta empresa com sinalizacao de risco."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={ticketsHref}>Abrir tickets</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {view.tickets.length ? view.tickets.map((ticket) => (
              <CompanyListRow
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                title={`${ticket.ticketNumber ? `#${ticket.ticketNumber} ` : ""}${ticket.subject || "Sem assunto"}`}
                meta={joinMeta([
                  ticket.status,
                  ticket.priority,
                  ticket.assignedToName || "Sem responsavel",
                  ticket.isResponseOverdue || ticket.isResolutionOverdue ? "SLA em risco" : null,
                  `Atualizado em ${formatDateTime(ticket.updatedAt)}`,
                ])}
                tone={ticket.isResponseOverdue || ticket.isResolutionOverdue ? "warning" : undefined}
              />
            )) : (
              <EmptyState title="Nenhum ticket vinculado" description="Ainda nao existem chamados associados a esta empresa." dashed />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Tarefas e Rotina Fiscal"
          description="Backlog operacional e competencias mensais da conta."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={tasksHref}>Abrir tarefas</Link>
            </Button>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Configuracao</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {view.monthlyRoutine.isConfigured ? (view.monthlyRoutine.isActive ? "Ativa" : "Configurada") : "Nao configurada"}
              </p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pendentes</p>
              <p className="mt-1 text-sm font-medium text-foreground">{view.monthlyRoutine.pendingCount}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Atrasadas</p>
              <p className="mt-1 text-sm font-medium text-foreground">{view.monthlyRoutine.overdueCount}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Aguardando cliente</p>
              <p className="mt-1 text-sm font-medium text-foreground">{view.monthlyRoutine.waitingCustomerCount}</p>
            </div>
          </div>

          <div className="space-y-3">
            {view.tasks.length ? view.tasks.map((task) => (
              <CompanyListRow
                key={task.id}
                title={task.title}
                meta={joinMeta([
                  task.type === "ROTINA_MENSAL" ? "Rotina mensal" : "Tarefa avulsa",
                  task.status,
                  task.competenceLabel || "Sem competencia",
                  task.nextStepLabel,
                  `Vence em ${formatDate(task.dueDate)}`,
                ])}
                href={tasksHref}
                tone={task.status === "OVERDUE" ? "warning" : undefined}
              />
            )) : (
              <EmptyState title="Nenhuma tarefa vinculada" description="A empresa ainda nao possui tarefas ou rotinas geradas." dashed />
            )}
          </div>

          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ultimas competencias</p>
            <div className="space-y-3">
              {view.monthlyRoutine.latestItems.length ? view.monthlyRoutine.latestItems.map((item) => (
                <CompanyListRow
                  key={item.id}
                  href={monthlyTasksHref}
                  title={item.competenceLabel}
                  meta={joinMeta([
                    item.status,
                    item.lastRequestStatus ? `Ultimo envio: ${item.lastRequestStatus}` : null,
                    item.nextStepLabel,
                    item.receivedAt ? `Recebido em ${formatDateTime(item.receivedAt)}` : `Vence em ${formatDate(item.dueDate)}`,
                  ])}
                  tone={item.status === "OVERDUE" ? "warning" : undefined}
                />
              )) : (
                <EmptyState title="Sem historico recente" description="Nenhuma competencia mensal recente foi encontrada para esta empresa." dashed />
              )}
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Ultimas Conversas"
          description="Conversas vinculadas localmente via Chatwoot/Evolution com sinais de follow-up."
        >
          <div className="space-y-3">
            {view.conversations.length ? view.conversations.map((conversation) => (
              <CompanyListRow
                key={conversation.id}
                href={conversation.chatwootUrl}
                title={joinMeta([
                  `Conversa ${conversation.chatwootConversationId}`,
                  conversation.whatsappNumber,
                ])}
                meta={joinMeta([
                  conversation.connectionName || "Sem conexao",
                  conversation.lastDeliveryStatus,
                  conversation.lastFailureCode ? `Falha ${conversation.lastFailureCode}` : null,
                  conversation.isStale ? "Sem atualizacao recente" : null,
                  `Atualizada em ${formatDateTime(conversation.updatedAt)}`,
                ])}
                tone={conversation.isStale || Boolean(conversation.lastFailureAt) ? "warning" : undefined}
              />
            )) : (
              <EmptyState title="Sem conversas vinculadas" description="Ainda nao existem mapeamentos locais de conversa para esta empresa." dashed />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Infraestrutura Remota"
          description="Hosts e sessoes recentes da operacao remota."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={hostsHref}>Abrir infraestrutura</Link>
            </Button>
          }
        >
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hosts</p>
              <div className="space-y-3">
                {view.hosts.length ? view.hosts.map((host) => (
                  <CompanyListRow
                    key={host.id}
                    href={`/portal/infraestrutura/hosts/${host.id}`}
                    title={host.name}
                    meta={joinMeta([
                      host.status,
                      host.serviceStatus || "Sem servico",
                      host.lastKnownRustDeskAlias || "Sem alias RustDesk",
                      host.lastHeartbeatSuccessAt ? `Heartbeat ${formatDateTime(host.lastHeartbeatSuccessAt)}` : "Sem heartbeat valido",
                    ])}
                    tone={!host.lastHeartbeatSuccessAt ? "warning" : undefined}
                  />
                )) : (
                  <EmptyState title="Nenhum host cadastrado" description="Nao ha hosts remotos vinculados a esta empresa." dashed />
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sessoes</p>
              <div className="space-y-3">
                {view.sessions.length ? view.sessions.map((session) => (
                  <CompanyListRow
                    key={session.id}
                    href="/portal/infraestrutura?tab=operacao&view=historico"
                    title={session.hostName}
                    meta={joinMeta([
                      session.status,
                      session.ticketNumber ? `Ticket ${session.ticketNumber}` : "Sem ticket",
                      session.requestedByName ? `Solicitado por ${session.requestedByName}` : null,
                      `Criada em ${formatDateTime(session.createdAt)}`,
                    ])}
                  />
                )) : (
                  <EmptyState title="Nenhuma sessao recente" description="Nao foram encontradas sessoes remotas recentes para esta empresa." dashed />
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Integracoes"
          description="Conexoes ativas usadas para atendimento e automacao."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/portal/configuracoes?tab=integrations">Abrir integracoes</Link>
            </Button>
          }
        >
          <div className="space-y-3">
            {view.integrations.length ? view.integrations.map((integration) => (
              <CompanyListRow
                key={integration.id}
                title={integration.name}
                meta={joinMeta([
                  integration.status,
                  integration.chatwootInboxLabel || "Inbox nao identificada",
                  integration.evolutionInstance || "Sem instance Evolution",
                  `Atualizada em ${formatDateTime(integration.updatedAt)}`,
                ])}
                tone={integration.status !== "ACTIVE" ? "warning" : undefined}
              />
            )) : (
              <EmptyState title="Nenhuma integracao vinculada" description="Esta empresa ainda nao possui conexoes persistidas de atendimento." dashed />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Releases Aplicaveis"
          description="Itens publicados para releases a partir dos tickets desta empresa."
        >
          <div className="space-y-3">
            {view.releases.length ? view.releases.map((release) => (
              <CompanyListRow
                key={release.ticketId}
                href={`/portal/tickets/${release.ticketId}`}
                title={release.title}
                meta={joinMeta([
                  release.type || "Sem tipo",
                  release.module || "Sem modulo",
                  release.summary ? "Com resumo de entrega" : null,
                  `Publicada em ${formatDate(release.publishedAt)}`,
                ])}
              />
            )) : (
              <EmptyState
                icon={BookCopy}
                title="Sem releases especificas"
                description="Ainda nao existem tickets desta empresa publicados nas notas de release."
                dashed
              />
            )}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Membros"
          value={view.profile.counts.users}
          description="Usuarios internos ou cliente vinculados por membership"
          icon={Building2}
          tone="neutral"
        />
        <MetricCard
          title="Contatos"
          value={view.profile.counts.contacts}
          description="Contatos vinculados ao contexto da empresa"
          icon={Boxes}
          tone="neutral"
        />
        <MetricCard
          title="Conversas"
          value={view.profile.counts.conversationLinks}
          description="Mapeamentos locais entre WhatsApp e Chatwoot"
          icon={HardDrive}
          tone="neutral"
        />
        <MetricCard
          title="Risco total"
          value={view.sla.responseOverdue + view.sla.resolutionOverdue + view.monthlyRoutine.overdueCount}
          description="Soma de SLA vencido e rotina fiscal atrasada"
          icon={AlertTriangle}
          tone={getSlaTone(view.sla.responseOverdue + view.sla.resolutionOverdue + view.monthlyRoutine.overdueCount)}
        />
      </section>
    </PageShell>
  );
}
