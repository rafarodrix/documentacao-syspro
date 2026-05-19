"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { TaskItem } from "@dosc-syspro/contracts/tarefas";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { ArrowUpRight, CalendarClock, CircleCheckBig, ClipboardPlus, Loader2, MessageSquareShare, RefreshCw, Ticket } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";
import { TaskManualRequestDialog } from "@/features/tarefas/interface/components/task-manual-request-dialog";
import { TaskCreateDialog } from "@/features/tarefas/interface/components/task-create-dialog";
import { TaskStatusDialog } from "@/features/tarefas/interface/components/task-status-dialog";
import { useChatwootDashboard } from "../chatwoot-dashboard-context";
import { ContextBadge, EmptyState, InlineLoading, InlineWarning } from "../chatwoot-dashboard-ui";

function getTaskStatusLabel(status: TaskItem["status"]) {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "WAITING_CUSTOMER":
      return "Aguardando cliente";
    case "RECEIVED":
      return "Recebido";
    case "SENT_TO_ACCOUNTING":
      return "Enviado para contabilidade";
    case "COMPLETED":
      return "Concluido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

function getTaskStatusTone(status: TaskItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "good" as const;
    case "OVERDUE":
      return "warn" as const;
    default:
      return "neutral" as const;
  }
}

function getRequestStatusLabel(status: TaskItem["lastManualRequestStatus"]) {
  switch (status) {
    case "SENT":
      return "Ultimo envio concluido";
    case "FAILED":
      return "Ultimo envio falhou";
    default:
      return "Sem disparo";
  }
}

function getTaskTypeLabel(type: TaskItem["type"]) {
  return type === "TAREFA" ? "Tarefa avulsa" : "Rotina mensal";
}

function getTaskTypeTone(type: TaskItem["type"]) {
  return type === "TAREFA" ? "good" as const : "neutral" as const;
}

export function ChatwootTarefasTab() {
  const { resolved, linkedCompanies } = useChatwootDashboard();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedManualItem, setSelectedManualItem] = useState<TaskItem | null>(null);
  const [selectedStatusItem, setSelectedStatusItem] = useState<TaskItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSyncing, startSyncTransition] = useTransition();

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const hasMultipleLinkedCompanies = linkedCompanies.length > 1;
  const needsContextSelection = hasMultipleLinkedCompanies && !resolved.companyId;

  useEffect(() => {
    if (!resolved.companyId) {
      setItems([]);
      setError(null);
      return;
    }

    let active = true;
    async function loadItems() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await trpc.tarefas.listTasks.query({
          page: "1",
          pageSize: "100",
          year: String(currentYear),
          month: String(currentMonth),
          status: "ALL",
        });

        if (!active) return;

        const nextItems: TaskItem[] = response.items
          .filter((item: TaskItem) => item.companyId === resolved.companyId)
          .sort(
            (a: TaskItem, b: TaskItem) =>
              Date.parse(a.dueDate) - Date.parse(b.dueDate),
          );

        setItems(nextItems);
      } catch (nextError) {
        if (!active) return;
        setItems([]);
        setError(nextError instanceof Error ? nextError.message : "Nao foi possivel carregar as tarefas.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();
    return () => {
      active = false;
    };
  }, [currentMonth, currentYear, reloadToken, resolved.companyId]);

  const openManualRequest = (item: TaskItem) => {
    setSelectedManualItem(item);
  };

  const openStatusDialog = (item: TaskItem) => {
    setSelectedStatusItem(item);
  };

  const handleRefresh = () => {
    setReloadToken((current) => current + 1);
  };

  const handleSync = () => {
    startSyncTransition(async () => {
      try {
        await trpc.tarefas.syncCompetencies.mutate({
          year: currentYear,
          month: currentMonth,
        });
        toast.success("Rotinas mensais sincronizadas para a empresa em contexto.");
        handleRefresh();
      } catch (nextError) {
        toast.error(nextError instanceof Error ? nextError.message : "Nao foi possivel sincronizar as rotinas mensais.");
      }
    });
  };

  return (
    <>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarClock className="h-4 w-4 text-primary" />
                Tarefas
              </CardTitle>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => setCreateDialogOpen(true)}
                disabled={!resolved.companyId || needsContextSelection}
              >
                <ClipboardPlus className="h-3.5 w-3.5" />
                Nova tarefa
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={handleRefresh}>
                Atualizar
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={handleSync} disabled={!resolved.companyId || isSyncing}>
                {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Sincronizar rotinas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsContextSelection ? (
            <EmptyState label="Escolha a empresa em contexto no topo do painel para operar as tarefas corretas desta conversa." />
          ) : null}
          {!resolved.companyId && !needsContextSelection ? (
            <InlineWarning message="Vincule ou selecione uma empresa para habilitar as tarefas desta conversa." />
          ) : null}

          {isLoading ? <InlineLoading label="Carregando tarefas da empresa..." /> : null}
          {error ? <InlineWarning message={error} /> : null}

          {!isLoading && !error && resolved.companyId && items.length === 0 ? (
            <EmptyState label="Nenhuma rotina mensal ou tarefa avulsa encontrada para a empresa em contexto." />
          ) : null}

          {!isLoading && !error && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                        <ContextBadge tone={getTaskTypeTone(item.type)}>
                          {getTaskTypeLabel(item.type)}
                        </ContextBadge>
                        <ContextBadge tone={getTaskStatusTone(item.status)}>
                          {getTaskStatusLabel(item.status)}
                        </ContextBadge>
                        <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                          Vence em {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                        </Badge>
                        {item.ticketId ? (
                          <Badge variant="outline" className="h-5 gap-1 rounded-full px-2 text-[10px]">
                            <Ticket className="h-3 w-3" />
                            Com ticket
                          </Badge>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.type === "ROTINA_MENSAL" ? "Contato cliente" : "Responsavel"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {item.type === "ROTINA_MENSAL"
                              ? item.clientContactName || "Nao definido"
                              : item.assignedToName || "Nao definido"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.type === "ROTINA_MENSAL" ? "Contabilidade" : "Contato cliente"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {item.type === "ROTINA_MENSAL"
                              ? item.accountingFirmName || "Nao vinculada"
                              : item.clientContactName || "Nao definido"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.type === "ROTINA_MENSAL" ? "Envios" : "Origem"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {item.type === "ROTINA_MENSAL"
                              ? `${item.manualRequestsCount} registrado(s)`
                              : item.ticketId
                                ? "Fechamento de ticket"
                                : "Criacao manual"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {item.type === "ROTINA_MENSAL" ? "Ultimo disparo" : "Ultima atualizacao"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-foreground">
                            {item.type === "ROTINA_MENSAL"
                              ? item.lastManualRequestAt
                                ? new Date(item.lastManualRequestAt).toLocaleString("pt-BR")
                                : "Sem envio"
                              : item.history[0]?.occurredAt
                                ? new Date(item.history[0].occurredAt).toLocaleString("pt-BR")
                                : "Sem historico"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {item.type === "ROTINA_MENSAL" ? (
                          <span>
                            {getRequestStatusLabel(item.lastManualRequestStatus)}
                            {item.lastManualRequestContactName ? ` com ${item.lastManualRequestContactName}` : ""}
                          </span>
                        ) : (
                          <span>
                            {item.assignedToName ? `Responsavel: ${item.assignedToName}` : "Sem responsavel definido"}
                          </span>
                        )}
                        {item.ticketId ? (
                          <Link
                            href={`/portal/tickets/${item.ticketId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Abrir ticket vinculado
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.type === "ROTINA_MENSAL" ? (
                        <Button type="button" size="sm" className="h-8 gap-1.5 px-3 text-xs" onClick={() => openManualRequest(item)}>
                          <MessageSquareShare className="h-3.5 w-3.5" />
                          {item.manualRequestsCount > 0 ? "Reenviar" : "Enviar mensagem"}
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-3 text-xs" onClick={() => openStatusDialog(item)}>
                        <CircleCheckBig className="h-3.5 w-3.5" />
                        Finalizar / status
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <TaskManualRequestDialog
        item={selectedManualItem}
        open={selectedManualItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedManualItem(null);
          }
        }}
        onSent={handleRefresh}
      />

      <TaskStatusDialog
        item={selectedStatusItem}
        open={selectedStatusItem != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStatusItem(null);
          }
        }}
        onSaved={handleRefresh}
      />

      <TaskCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleRefresh}
        initialCompanyId={resolved.companyId || undefined}
        lockCompany={Boolean(resolved.companyId)}
      />
    </>
  );
}
