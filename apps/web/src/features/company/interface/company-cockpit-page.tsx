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
  Server,
} from "lucide-react";
import type { CompanyCockpitViewData } from "@dosc-syspro/contracts/company";
import { Badge, Button } from "@dosc-syspro/ui";
import { EmptyState, MetricCard, PageHeader, PageShell, SectionCard } from "@/components/patterns";
import { formatCNPJ } from "@/lib/formatters";
import { getCompanySegmentLabel } from "@/features/company/domain/company-segments";

function joinMeta(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part)).join(" | ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
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

export function CompanyCockpitPage({
  view,
  backHref,
  editHref,
}: {
  view: CompanyCockpitViewData;
  backHref: string;
  editHref: string;
}) {
  const statusBadge = getStatusBadge(view.profile.status);
  const segmentLabel = view.profile.segment ? getCompanySegmentLabel(view.profile.segment) : "Sem segmento";
  const tasksHref = `/portal/tarefas?companyId=${view.profile.companyId}`;
  const monthlyTasksHref = `${tasksHref}&type=ROTINA_MENSAL`;

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
            <Button asChild size="sm">
              <Link href={editHref}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar empresa
              </Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
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
          title="Alertas"
          description="Pontos que merecem atencao antes de abrir mais volume."
        >
          <div className="space-y-3">
            {view.profile.blockedReasonLabel ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                Contrato bloqueado: {view.profile.blockedReasonLabel}
              </div>
            ) : null}
            {view.sla.responseOverdue > 0 || view.sla.resolutionOverdue > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                Existem {view.sla.responseOverdue + view.sla.resolutionOverdue} riscos de SLA ativos nesta conta.
              </div>
            ) : null}
            {view.monthlyRoutine.overdueCount > 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                {view.monthlyRoutine.overdueCount} rotina(s) mensais estao atrasadas.
              </div>
            ) : null}
            {!view.profile.blockedReasonLabel &&
            view.sla.responseOverdue === 0 &&
            view.sla.resolutionOverdue === 0 &&
            view.monthlyRoutine.overdueCount === 0 ? (
              <EmptyState
                icon={Building2}
                title="Sem alertas criticos"
                description="A conta nao apresenta bloqueio contratual, SLA vencido ou rotina mensal atrasada neste momento."
                dashed
              />
            ) : null}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          description={`${view.sessions.length} sessoes mais recentes carregadas neste cockpit`}
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

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Tickets e SLA"
          description="Chamados mais recentes desta empresa com sinalizacao de risco."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={`/portal/tickets?companyId=${view.profile.companyId}`}>Abrir tickets</Link>
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
                    `Vence em ${formatDate(item.dueDate)}`,
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
          description="Conversas vinculadas localmente via Chatwoot/Evolution."
        >
          <div className="space-y-3">
            {view.conversations.length ? view.conversations.map((conversation) => (
              <CompanyListRow
                key={conversation.id}
                href={conversation.chatwootUrl}
                title={`Conversa ${conversation.chatwootConversationId}`}
                meta={joinMeta([
                  conversation.connectionName || "Sem conexao",
                  conversation.lastDeliveryStatus,
                  `Atualizada em ${formatDateTime(conversation.updatedAt)}`,
                ])}
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
              <Link href={`/portal/infraestrutura?tab=hosts&companyId=${view.profile.companyId}`}>Abrir infraestrutura</Link>
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
                    ])}
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
                ])}
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
          description="Usuarios internos/cliente vinculados por membership"
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
