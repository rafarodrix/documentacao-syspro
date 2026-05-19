"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Loader2, MessageSquare, Ticket, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@dosc-syspro/ui";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import { getSuggestedCategoryForTeam } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import {
  ContextBadge,
  EmptyState,
  InlineLoading,
  InlineNotice,
  InlineWarning,
  formatRelativeDate,
} from "../chatwoot-dashboard-ui";

export function ChatwootTicketsTab() {
  const {
    resolved,
    linkedCompanies,
    contextCompanyId,
    latestTickets,
    isLoadingTickets,
    ticketError,
    showEmbeddedTicketForm,
    embeddedTicketForm,
    isSubmittingEmbeddedTicket,
    embeddedTicketFeedback,
    filteredCategories,
    matchedExistingTicket,
    hasExistingTicket,
    existingTicket,
    priorityTicket,
    canCreateTicket,
    ticketSettings,
    setShowEmbeddedTicketForm,
    setActiveTab,
    setEmbeddedTicketFeedback,
    setEmbeddedTicketForm,
    setTicketReloadToken,
    handleEmbeddedTicketSubmit,
  } = useChatwootDashboard();

  const hasMultipleLinkedCompanies = linkedCompanies.length > 1;
  const needsContextSelection = hasMultipleLinkedCompanies && !contextCompanyId;
  const hasLinkedCompanies = linkedCompanies.length > 0;
  const canUseTickets = canCreateTicket && !needsContextSelection;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ticket className="h-4 w-4 text-primary" />
              Tickets da empresa
            </CardTitle>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant={showEmbeddedTicketForm ? "secondary" : "default"}
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={() => {
                setShowEmbeddedTicketForm((current) => !current);
                setActiveTab("tickets");
                setEmbeddedTicketFeedback(null);
              }}
              disabled={!canUseTickets}
            >
              <Ticket className="h-3.5 w-3.5" />
              {showEmbeddedTicketForm ? "Fechar" : "Novo ticket"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setTicketReloadToken((current) => current + 1)}
            >
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Embedded ticket creation form */}
        {showEmbeddedTicketForm ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <form onSubmit={handleEmbeddedTicketSubmit}>
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_18rem]">

                {/* Left — content */}
                <div className="space-y-4 p-4 xl:border-r xl:border-border/60">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Resumo do chamado
                  </p>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Assunto</label>
                    <Input
                      value={embeddedTicketForm.title}
                      onChange={(event) =>
                        setEmbeddedTicketForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="Ex: Erro ao emitir nota fiscal"
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Descricao</label>
                    <Textarea
                      value={embeddedTicketForm.description}
                      onChange={(event) =>
                        setEmbeddedTicketForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Passo a passo, resultado esperado, mensagem de erro e usuarios impactados."
                      className="min-h-48 bg-background leading-relaxed"
                    />
                  </div>
                </div>

                {/* Right — classification */}
                <div className="space-y-3 border-t border-border/60 bg-muted/10 p-4 xl:border-t-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Waypoints className="h-3.5 w-3.5" />
                    Classificacao
                  </p>

                  {/* Context strip — compact, no duplicate boxes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Setor</label>
                    <Select
                      value={embeddedTicketForm.team}
                      onValueChange={(value) =>
                        setEmbeddedTicketForm((current) => {
                          const nextTeam = value === "DESENVOLVIMENTO" ? "DESENVOLVIMENTO" : "SUPORTE";
                          const nextCategory =
                            ticketSettings.categories.find(
                              (category) => category.value === current.category && category.defaultTeam === nextTeam,
                            )?.value ||
                            getSuggestedCategoryForTeam(ticketSettings, nextTeam) ||
                            ticketSettings.categories[0]?.value ||
                            "";
                          return { ...current, team: nextTeam, category: nextCategory };
                        })
                      }
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketSettings.teams.map((team) => (
                          <SelectItem key={team.id} value={team.value}>
                            {team.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
                    <Select
                      value={embeddedTicketForm.priorityValue}
                      onValueChange={(value) =>
                        setEmbeddedTicketForm((current) => ({ ...current, priorityValue: value }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketSettings.priorities.map((priority) => (
                          <SelectItem key={priority.id} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
                    <Select
                      value={embeddedTicketForm.category}
                      onValueChange={(value) =>
                        setEmbeddedTicketForm((current) => ({ ...current, category: value }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map((category) => (
                          <SelectItem key={category.id} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Modulo</label>
                    <TicketModuleCascadeSelect
                      options={ticketSettings.modules}
                      value={embeddedTicketForm.module}
                      onChange={(value) =>
                        setEmbeddedTicketForm((current) => ({ ...current, module: value }))
                      }
                      mode="single"
                      compact
                      labels={{ single: "Modulo, submodulo e tela" }}
                    />
                  </div>
                </div>
              </div>

              {hasExistingTicket ? (
                <div className="mx-4 mb-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                  Esta conversa ja referencia o ticket #{existingTicket.number}. Abra outro apenas se a demanda precisar ser separada.
                </div>
              ) : null}

              {embeddedTicketFeedback ? (
                <div className="mx-4 mb-1">
                  <InlineNotice tone={embeddedTicketFeedback.tone} message={embeddedTicketFeedback.message} />
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-4 py-3">
                <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-3 text-xs">
                  <Link href={resolved.ticketHref} target="_blank" rel="noreferrer">
                    Tela completa
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setEmbeddedTicketForm((current) => ({ ...current, title: "", description: "" }));
                    setEmbeddedTicketFeedback(null);
                  }}
                >
                  Limpar
                </Button>
                <Button type="submit" size="sm" className="h-8 gap-1.5 px-3 text-xs" disabled={isSubmittingEmbeddedTicket}>
                  {isSubmittingEmbeddedTicket ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
                  Criar ticket
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Priority ticket highlight */}
        {priorityTicket ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ContextBadge tone={matchedExistingTicket ? "good" : "neutral"}>
                    {matchedExistingTicket ? "Ticket da conversa" : "Mais relevante"}
                  </ContextBadge>
                  <ContextBadge tone="neutral">{priorityTicket.statusLabel}</ContextBadge>
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                  #{priorityTicket.number} - {priorityTicket.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Atualizado {formatRelativeDate(priorityTicket.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild size="sm" className="h-8 gap-1.5 px-3 text-xs">
                  <Link href={`/portal/tickets/${priorityTicket.id}`} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Abrir
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(priorityTicket.number));
                      toast.success("Numero copiado.");
                    } catch {
                      toast.error("Nao foi possivel copiar.");
                    }
                  }}
                >
                  Copiar #
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isLoadingTickets ? <InlineLoading label="Carregando tickets..." /> : null}
        {ticketError ? <InlineWarning message={ticketError} /> : null}
        {!isLoadingTickets && !ticketError && !canUseTickets ? (
          <EmptyState
            label={
              needsContextSelection
                ? "Selecione a empresa em contexto no topo do painel para listar os tickets corretos."
                : hasLinkedCompanies
                  ? "Defina a empresa em contexto para liberar os tickets desta conversa."
                  : "Nenhuma empresa vinculada encontrada para este contato."
            }
          />
        ) : null}
        {!isLoadingTickets && !ticketError && canUseTickets && latestTickets.length === 0 ? (
          <EmptyState label="Nenhum ticket aberto encontrado para a empresa em contexto." />
        ) : null}

        {/* Remaining tickets (priority excluded) */}
        {!isLoadingTickets && !ticketError && canUseTickets && latestTickets.length > 0 ? (
          <div className="space-y-1.5">
            {latestTickets.filter((ticket) => ticket.id !== priorityTicket?.id).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    #{ticket.number} - {ticket.title}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <ContextBadge tone={ticket.number === resolved.ticketNumber ? "good" : "neutral"}>
                      {ticket.statusLabel}
                    </ContextBadge>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {formatRelativeDate(ticket.createdAt)}
                    </span>
                  </div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 px-2.5 text-xs">
                  <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noreferrer">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Abrir
                    </span>
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
