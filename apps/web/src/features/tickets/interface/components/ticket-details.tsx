"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ChevronDown, ChevronUp, Clock3, Disc3, Loader2, UserRound, Zap } from "lucide-react";
import { type TicketModuleStatus } from "@dosc-syspro/contracts/ticket";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Separator, Textarea } from "@dosc-syspro/ui";
import { ErrorState } from "@/components/patterns";
import { useTicketArchive } from "@/features/tickets/interface/hooks/use-ticket-archive";
import { useTicketClassification } from "@/features/tickets/interface/hooks/use-ticket-classification";
import { useTicketOwners } from "@/features/tickets/interface/hooks/use-ticket-owners";
import { useInternalUsers } from "@/features/user-access/interface/hooks/use-internal-users";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { useTicketTimeline } from "@/features/tickets/interface/hooks/use-ticket-timeline";
import { useTicketDetailsWorkflow } from "@/features/tickets/interface/hooks/use-ticket-details-workflow";
import { TicketChat } from "@/features/tickets/interface/components/ticket-chat";
import { TicketFinalizeDialog } from "@/features/tickets/interface/components/ticket-finalize-dialog";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import { TicketTestingReturnDialog } from "@/features/tickets/interface/components/ticket-testing-return-dialog";
import { cn } from "@/lib/utils";
import { formatTicketDate } from "./ticket-details.helpers";
import { isTicketClosed } from "./ticket-details.helpers";
import { getCategoriesForTeam, ClassificationDropdown, NativeSelectPill, PriorityDropdown, StatusDropdown, resolveOptionLabel } from "./ticket-classification-fields";
import { CustomerContextCard, DetailDate, EditableSidebarField, ExternalTicketLink, SidebarField } from "./ticket-sidebar-fields";
import { SupportPeopleFields, getAssignableUsers } from "./ticket-owner-select";
import { SlaCompact } from "./ticket-sla-compact";
import type { TicketArticleItem, TicketDetailsItem, TicketMessagePagination } from "./ticket-view.types";

interface TicketDetailsProps {
  ticket?: TicketDetailsItem;
  articles: TicketArticleItem[];
  messagePagination?: TicketMessagePagination;
  canManageTickets: boolean;
  error?: string;
}

export function TicketDetails({ ticket, articles, messagePagination, canManageTickets, error }: TicketDetailsProps) {
  const router = useRouter();
  const ticketSettings = useTicketModuleSettings();
  const internalUsers = useInternalUsers();
  const { timelineArticles, timelinePagination, isLoadingOlderArticles, loadOlderArticles } = useTicketTimeline(ticket, articles, messagePagination);
  const { archiveDialogOpen, setArchiveDialogOpen, isArchiving, handleArchiveTicket } = useTicketArchive(ticket?.id);
  const {
    isPending, transferNote, setTransferNote,
    currentTeam, currentModule, currentCategory, currentPriority,
    initialTeam, initialModule, initialCategory, initialPriority,
    classificationDirty, requiresTransferNote, requiresTestingReturnNote,
    changeTeam, changeClassification, resetClassificationDraft, persistWorkflowChange, saveClassification,
  } = useTicketClassification(ticket, canManageTickets);
  const { isUpdatingOwners, onUpdateOwners } = useTicketOwners(ticket?.id);

  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    finalizeOpen,
    setFinalizeOpen,
    testingReturnOpen,
    setTestingReturnOpen,
    changeStatus,
  } = useTicketDetailsWorkflow({
    ticketStatus: ticket?.status,
    ticketSettings,
    classificationDirty,
    persistWorkflowChange,
  });

  useTicketHotkeys({
    onChangeStatus: () => document.getElementById("transfer-ticket-btn")?.click(),
    onReply: () => document.getElementById("ticket-reply-input")?.focus(),
  });

  if (error || !ticket) {
    return (
      <ErrorState
        className="h-[60vh] animate-in fade-in zoom-in duration-500"
        title="Nao foi possivel carregar o chamado"
        description={error || "O ticket pode nao existir ou voce nao tem permissao."}
        action={{ label: "Voltar para lista", onClick: () => router.back() }}
      />
    );
  }

  const isClosedTicket = isTicketClosed(ticket.status);
  const categoryOptions = getCategoriesForTeam(ticketSettings.categories, currentTeam, currentCategory);
  const canManageRelease = currentTeam === "DESENVOLVIMENTO" || Boolean(ticket.publishToReleases);
  const supportUsers = getAssignableUsers(internalUsers, "SUPORTE");
  const developmentUsers = getAssignableUsers(internalUsers, "DESENVOLVIMENTO");

  return (
    <div className="mx-auto max-w-360 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full hover:bg-muted/80" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <span className="font-mono text-xs text-muted-foreground">{ticket.number}</span>
      </div>

      <div className="mb-6">
        <h1 className="max-w-full wrap-break-word text-xl font-bold leading-snug tracking-tight text-foreground md:text-2xl">{ticket.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> Criado em {ticket.createdAt}</span>
          {ticket.operations?.openedByName && <span className="flex items-center gap-1"><UserRound className="h-3 w-3" /> Aberto por {ticket.operations.openedByName}</span>}
          {ticket.updatedAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Atualizado em {formatTicketDate(ticket.updatedAt)}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-10 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-8">
          <TicketChat
            ticketId={String(ticket.id)}
            articles={timelineArticles}
            ticketStatus={ticket.status || ""}
            messagePagination={timelinePagination}
            isLoadingOlder={isLoadingOlderArticles}
            onLoadOlder={loadOlderArticles}
          />
        </div>

        <aside className="min-w-0 space-y-4 lg:col-span-4">
          <button
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/10 p-3 text-sm font-medium lg:hidden"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            type="button"
          >
            <span>Detalhes do chamado</span>
            {sidebarCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          <div className={cn("space-y-4", sidebarCollapsed && "hidden lg:block")}>
            <CustomerContextCard ticket={ticket} />

            <Card className="border-border/60 bg-card/95 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  Informacoes
                  {classificationDirty && (
                    <Badge variant="outline" className="ml-auto rounded-full border-amber-500/30 bg-amber-500/10 px-2 text-[10px] text-amber-600 dark:text-amber-400"> {/* ds-allow */}
                      Rascunho
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <section className="space-y-3">
                  <EditableSidebarField label="Setor atual">
                    <NativeSelectPill
                      id="transfer-ticket-btn"
                      value={currentTeam}
                      label={resolveOptionLabel(ticketSettings.teams, currentTeam)}
                      disabled={!canManageTickets || isPending}
                      options={ticketSettings.teams.map((team) => ({ value: team.value, label: team.label }))}
                      onChange={changeTeam}
                    />
                  </EditableSidebarField>
                  <EditableSidebarField label="Categoria">
                    <ClassificationDropdown value={currentCategory} fallback="Nao definida" options={categoryOptions} disabled={!canManageTickets || isPending} onChange={(category) => changeClassification({ category })} />
                  </EditableSidebarField>
                  <EditableSidebarField label="Estagio atual">
                    <StatusDropdown status={ticket.status} statusLabel={ticket.statusLabel} disabled={!canManageTickets || isPending} onChange={changeStatus} />
                  </EditableSidebarField>
                  <EditableSidebarField label="Prioridade">
                    <PriorityDropdown priority={currentPriority} options={ticketSettings.priorities} disabled={!canManageTickets || isPending} onChange={(priority) => changeClassification({ priority })} />
                  </EditableSidebarField>
                  <EditableSidebarField label="Modulo">
                    <TicketModuleCascadeSelect options={ticketSettings.modules} value={currentModule} onChange={(module) => changeClassification({ module })} disabled={!canManageTickets || isPending} compact mode="single" labels={{ single: "Modulo, submodulo e tela" }} />
                  </EditableSidebarField>
                  {requiresTransferNote && (
                    <EditableSidebarField label="Contexto para o desenvolvimento">
                      <Textarea value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="Contexto para transferir ao desenvolvimento." className="min-h-24 resize-none border-border/70 bg-background text-sm" disabled={isPending} />
                      <p className="mt-1 text-[10px] text-muted-foreground">Minimo 20 caracteres.</p>
                    </EditableSidebarField>
                  )}
                  {requiresTestingReturnNote && (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground"> {/* ds-allow */}
                      Ao voltar de <span className="font-medium text-foreground">Em teste</span> para <span className="font-medium text-foreground">Em desenvolvimento</span>, informe o motivo na nota interna.
                    </div>
                  )}
                  {canManageTickets && classificationDirty && (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" className="h-8 flex-1 text-xs" disabled={isPending} onClick={saveClassification}>
                        {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Salvar alteracoes
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" disabled={isPending} onClick={resetClassificationDraft}>
                        <Disc3 className="mr-2 h-3.5 w-3.5" />
                        Descartar
                      </Button>
                    </div>
                  )}
                </section>

                <Separator />
                <SlaCompact ticket={ticket} isClosedTicket={isClosedTicket} />

                {isClosedTicket && canManageTickets && canManageRelease && (
                  <>
                    <Separator />
                    <section className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Release</p>
                      <Button type="button" variant="outline" className="h-9 w-full justify-start text-xs" onClick={() => setFinalizeOpen(true)}>
                        {ticket.publishToReleases ? "Atualizar publicacao" : "Publicar em Releases"}
                      </Button>
                    </section>
                  </>
                )}

                <Separator />
                <section className="space-y-3">
                  <SupportPeopleFields ticket={ticket} canManageTickets={canManageTickets} isPending={isUpdatingOwners} supportUsers={supportUsers} developmentUsers={developmentUsers} onUpdateOwners={onUpdateOwners} />
                  <SidebarField label="Resolucao" value={<DetailDate value={ticket.resolvedAt} fallback="Pendente" />} />
                </section>

                {ticket.resolvedByName && (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <SidebarField label="Resolvido por" value={<span className="text-xs">{ticket.resolvedByName}</span>} />
                    </section>
                  </>
                )}

                <Separator />
                <section className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acoes</p>
                  {isClosedTicket || !canManageTickets ? (
                    <p className="text-xs text-muted-foreground">Ticket fechado.</p>
                  ) : archiveDialogOpen ? (
                    <div className="space-y-3 rounded-md border border-border/60 bg-background p-3">
                      <p className="text-xs font-medium text-foreground">Confirmar arquivamento?</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">O ticket sai da fila ativa.</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setArchiveDialogOpen(false)} disabled={isArchiving}>Cancelar</Button>
                        <Button type="button" size="sm" className="flex-1 text-xs" onClick={handleArchiveTicket} disabled={isArchiving}>
                          {isArchiving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Arquivar"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="h-9 w-full justify-start text-xs" onClick={() => setArchiveDialogOpen(true)}>
                      Arquivar ticket
                    </Button>
                  )}
                </section>
              </CardContent>
            </Card>

            {(ticket.origin?.source || ticket.origin?.contactName || ticket.origin?.contactPhone || ticket.origin?.contactWhatsapp || ticket.origin?.chatwootConversationUrl) && (
              <Card className="border-border/60 bg-card/95 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> {/* ds-allow */}
                    Contexto e origem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {ticket.origin?.source && <div className="flex items-center gap-2"><Badge variant="outline" className="px-2 text-[10px] uppercase tracking-wide">{ticket.origin.source}</Badge></div>}
                  {ticket.origin?.contactName && <SidebarField label="Contato" value={<span className="text-xs">{ticket.origin.contactName}</span>} />}
                  {ticket.origin?.contactPhone && <SidebarField label="Telefone" value={<span className="font-mono text-xs">{ticket.origin.contactPhone}</span>} />}
                  {ticket.origin?.contactWhatsapp && <SidebarField label="WhatsApp" value={<span className="font-mono text-xs">{ticket.origin.contactWhatsapp}</span>} />}
                  {ticket.origin?.chatwootConversationUrl && <ExternalTicketLink href={ticket.origin.chatwootConversationUrl} label="Ver conversa no Chatwoot" />}
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </div>

      <TicketFinalizeDialog ticket={ticket} open={finalizeOpen} onOpenChange={setFinalizeOpen} />
      <TicketTestingReturnDialog
        ticket={ticket}
        open={testingReturnOpen}
        onOpenChange={setTestingReturnOpen}
        payload={{
          ...(currentTeam !== initialTeam ? { team: currentTeam } : {}),
          ...(currentModule !== initialModule ? { module: currentModule } : {}),
          ...(currentCategory !== initialCategory ? { category: currentCategory } : {}),
          ...(currentPriority !== initialPriority ? { priority: currentPriority } : {}),
          status: "IN_PROGRESS",
        }}
        successMessage={classificationDirty ? "Classificacao e estagio atualizados." : "Estagio atualizado."}
      />
    </div>
  );
}
