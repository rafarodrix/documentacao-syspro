"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Loader2, MessageSquare, Ticket, Waypoints } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
    effectiveContactName,
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

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ticket className="h-4 w-4 text-primary" />
              Tickets da empresa
            </CardTitle>
            <CardDescription>
              Abra o ticket sem sair do Chatwoot e acompanhe somente os chamados ainda abertos desta empresa.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={showEmbeddedTicketForm ? "secondary" : "default"}
              size="sm"
              className="gap-2"
              onClick={() => {
                setShowEmbeddedTicketForm((current) => !current);
                setActiveTab("tickets");
                setEmbeddedTicketFeedback(null);
              }}
              disabled={!canCreateTicket}
            >
              <Ticket className="h-4 w-4" />
              {showEmbeddedTicketForm ? "Fechar formulario" : "Criar ticket aqui"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTicketReloadToken((current) => current + 1)}
            >
              Atualizar lista
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showEmbeddedTicketForm ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <form className="space-y-3" onSubmit={handleEmbeddedTicketSubmit}>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="space-y-4 p-4 xl:border-r xl:border-border/60">
                  <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Resumo do chamado
                  </div>
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
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-sm font-semibold text-foreground">Descricao detalhada</label>
                      <span className="text-[11px] text-muted-foreground">Passo a passo validado pelo analista</span>
                    </div>
                    <Textarea
                      value={embeddedTicketForm.description}
                      onChange={(event) =>
                        setEmbeddedTicketForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Informe o passo a passo, resultado esperado, mensagem de erro e usuarios impactados."
                      className="min-h-55 bg-background leading-relaxed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use o mesmo nivel de detalhe da abertura normal do modulo para reduzir retrabalho.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-muted/5 p-4">
                  <div className="inline-flex items-center gap-2 rounded-md border border-border/40 bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                    <Waypoints className="h-3.5 w-3.5" />
                    Informacoes
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classificacao</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Define fila, prioridade, categoria e modulo inicial do chamado.
                    </p>
                  </div>
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
                      <SelectTrigger className="h-10 bg-background">
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
                      <SelectTrigger className="h-10 bg-background">
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
                      <SelectTrigger className="h-10 bg-background">
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

                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</p>
                    <p className="mt-1 font-medium">{resolved.companyName || resolved.companyId || "Sem empresa"}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
                    <p className="mt-1 font-medium">{effectiveContactName || "Nao identificado"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resolved.customerPhone || resolved.customerEmail || "Sem telefone/e-mail"}
                    </p>
                  </div>
                </div>
              </div>

              {hasExistingTicket ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  Esta conversa ja referencia o ticket #{existingTicket.number}. Abra outro apenas se a demanda realmente precisar ser separada.
                </div>
              ) : null}

              {embeddedTicketFeedback ? (
                <InlineNotice tone={embeddedTicketFeedback.tone} message={embeddedTicketFeedback.message} />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 pb-1 pt-3">
                <p className="text-xs text-muted-foreground">
                  O envio usa a mesma sessao do portal neste navegador e mantem o atendente dentro da conversa.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <Link href={resolved.ticketHref} target="_blank" rel="noreferrer">
                      Tela completa
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEmbeddedTicketForm((current) => ({ ...current, title: "", description: "" }));
                      setEmbeddedTicketFeedback(null);
                    }}
                  >
                    Limpar
                  </Button>
                  <Button type="submit" size="sm" className="gap-2" disabled={isSubmittingEmbeddedTicket}>
                    {isSubmittingEmbeddedTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                    Criar ticket
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : null}

        {priorityTicket ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                  {matchedExistingTicket ? "Ticket da conversa" : "Ticket mais relevante"}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  #{priorityTicket.number} · {priorityTicket.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <ContextBadge tone={matchedExistingTicket ? "good" : "neutral"}>
                    {priorityTicket.statusLabel}
                  </ContextBadge>
                  <span>Atualizado em {formatRelativeDate(priorityTicket.updatedAt)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="gap-2">
                  <Link href={`/portal/tickets/${priorityTicket.id}`} target="_blank" rel="noreferrer">
                    <ArrowUpRight className="h-4 w-4" />
                    Abrir ticket
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(String(priorityTicket.number));
                      toast.success("Numero do ticket copiado.");
                    } catch {
                      toast.error("Nao foi possivel copiar o numero do ticket.");
                    }
                  }}
                >
                  Copiar numero
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {isLoadingTickets ? <InlineLoading label="Carregando tickets reais da empresa..." /> : null}
        {ticketError ? <InlineWarning message={ticketError} /> : null}
        {!isLoadingTickets && !ticketError && latestTickets.length === 0 ? (
          <EmptyState label="Nenhum ticket aberto encontrado para esta empresa." />
        ) : null}
        {!isLoadingTickets && !ticketError && latestTickets.length > 0 ? (
          <div className="space-y-2">
            {latestTickets.filter((ticket) => ticket.id !== priorityTicket?.id).map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-border/60 bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      #{ticket.number} · {ticket.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {ticket.number === resolved.ticketNumber ? (
                        <ContextBadge tone="good">Ticket da conversa</ContextBadge>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Criado em {formatRelativeDate(ticket.createdAt)}
                      </span>
                      <span>Estagio atual: {ticket.statusLabel}</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noreferrer">
                      Ver
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
