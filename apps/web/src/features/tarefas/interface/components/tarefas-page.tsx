"use client";

import { trpc } from "@/lib/api/trpc-client";
import { RegistryEmptyState, RegistryPagination, RegistryTableCard } from "@/components/platform/shared/registry-list-scaffold";
import type { TaskItem, TaskItemListResponse } from "@dosc-syspro/contracts/tarefas";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dosc-syspro/ui";
import { CircleAlert, ExternalLink, Filter, ListTodo, MessageSquareShare, Plus, RefreshCw, Repeat, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskDetailsDialog } from "./task-details-dialog";
import { TaskManualRequestDialog } from "./task-manual-request-dialog";
import { TaskStatusDialog } from "./task-status-dialog";
import { cn } from "@/lib/utils";

interface TarefasPageProps {
  tasks: TaskItemListResponse;
  search: string;
  status: string;
  type: string;
  canManage: boolean;
}

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

function getTaskStatusVariant(status: TaskItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "OVERDUE":
      return "destructive" as const;
    case "SENT_TO_ACCOUNTING":
      return "info" as const;
    case "RECEIVED":
      return "warning" as const;
    case "WAITING_CUSTOMER":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function getManualRequestStatusLabel(status: TaskItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "Enviado";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

function getManualRequestStatusVariant(status: TaskItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "success" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function getTaskTypeLabel(type: TaskItem["type"]) {
  return type === "ROTINA_MENSAL" ? "Rotina mensal" : "Tarefa avulsa";
}

function getTaskTypeVariant(type: TaskItem["type"]) {
  return type === "ROTINA_MENSAL" ? "secondary" as const : "outline" as const;
}

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Todas", countKey: "total" },
  { value: "PENDING", label: "Pendentes", countKey: "pending" },
  { value: "WAITING_CUSTOMER", label: "Aguardando cliente", countKey: "waitingCustomer" },
  { value: "RECEIVED", label: "Recebidas", countKey: "received" },
  { value: "SENT_TO_ACCOUNTING", label: "Enviadas", countKey: "sentToAccounting" },
  { value: "OVERDUE", label: "Atrasadas", countKey: "overdue" },
] as const;

const ADVANCED_STATUS_FILTER_OPTIONS = [
  ...STATUS_FILTER_OPTIONS,
  { value: "COMPLETED", label: "Concluidas", countKey: "completed" },
] as const;

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "ROTINA_MENSAL", label: "Rotinas mensais" },
  { value: "TAREFA", label: "Tarefas avulsas" },
] as const;

export function TarefasPage({ tasks, search, status, type, canManage }: TarefasPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(search);
  const deferredSearch = useDeferredValue(searchDraft);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [selectedStatusTask, setSelectedStatusTask] = useState<TaskItem | null>(null);
  const [selectedDetailsTaskId, setSelectedDetailsTaskId] = useState<string | null>(null);
  const [selectedRowTaskId, setSelectedRowTaskId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    if (!tasks.items.length) {
      setSelectedRowTaskId(null);
      return;
    }

    setSelectedRowTaskId((current) => {
      if (current && tasks.items.some((item) => item.id === current)) {
        return current;
      }
      return tasks.items[0]?.id ?? null;
    });
  }, [tasks.items]);

  useEffect(() => {
    const normalizedCurrent = (searchParams.get("search") ?? "").trim();
    const normalizedNext = deferredSearch.trim();
    if (normalizedCurrent === normalizedNext) return;

    const handle = window.setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (normalizedNext) {
          params.set("search", normalizedNext);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
      });
    }, 300);

    return () => window.clearTimeout(handle);
  }, [deferredSearch, pathname, router, searchParams]);

  const setStatusFilter = (nextStatus: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus && nextStatus !== "ALL") {
        params.set("status", nextStatus);
      } else {
        params.delete("status");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const setTypeFilter = (nextType: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextType && nextType !== "ALL") {
        params.set("type", nextType);
      } else {
        params.delete("type");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const setPage = (nextPage: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(nextPage));
      }
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const clearFilters = () => {
    setSearchDraft("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("search");
      params.delete("status");
      params.delete("type");
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const hasActiveFilters = Boolean(search.trim()) || status !== "ALL" || type !== "ALL";

  const handleSyncMonth = () => {
    startSyncTransition(async () => {
      try {
        const result = await trpc.tarefas.syncCompetencies.mutate({
          year: tasks.year ?? undefined,
          month: tasks.month ?? undefined,
        });
        toast.success(`${result.message} ${result.generated} gerada(s), ${result.updated} atualizada(s).`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel sincronizar as rotinas do mes.");
      }
    });
  };

  const competenceLabel = tasks.year && tasks.month
    ? `${String(tasks.month).padStart(2, "0")}/${tasks.year}`
    : null;
  const isManualBacklogView = type === "TAREFA";
  const isMonthlyView = type === "ROTINA_MENSAL";
  const pageTitle = isManualBacklogView
    ? "Backlog operacional"
    : isMonthlyView
      ? competenceLabel
        ? `Rotinas mensais de ${competenceLabel}`
        : "Rotinas mensais"
      : competenceLabel
        ? `Backlog operacional + rotinas de ${competenceLabel}`
        : "Tarefas";
  const pageDescription = isManualBacklogView
    ? "Tarefas avulsas permanecem visiveis no backlog ate serem concluidas ou canceladas, sem depender da competencia mensal."
    : isMonthlyView
      ? "Rotinas mensais sempre obedecem o recorte da competencia selecionada."
      : "Nesta visao consolidada, rotinas mensais respeitam a competencia e tarefas avulsas continuam no backlog operacional.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Tarefas</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Gerencie rotinas mensais por competencia e tarefas avulsas como backlog operacional continuo.
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" onClick={() => setIsCreateDialogOpen(true)} className="h-10 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
            {!isManualBacklogView ? (
              <Button type="button" variant="outline" onClick={handleSyncMonth} disabled={isSyncing} className="h-10 w-full sm:w-auto">
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sincronizando..." : "Sincronizar rotinas do mes"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:w-auto">
            <div className="flex min-w-max rounded-md bg-muted/40 p-1">
              {STATUS_FILTER_OPTIONS.map((option) => {
                const count =
                  option.countKey === "total"
                    ? tasks.summary.total
                    : tasks.summary[option.countKey];
                const isActive = status === option.value || (status === "" && option.value === "ALL");

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`h-8 px-4 ${isActive ? "bg-background shadow-sm" : ""}`}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label} ({count})
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-1 items-center gap-3 w-full xl:w-auto">
            <div className="group relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Buscar por empresa, tarefa, contato ou contador..."
                className="h-10 rounded-md border-border/60 bg-background pl-10 text-sm transition-all focus:border-primary/50 w-full"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 text-muted-foreground hover:text-foreground"
                  onClick={clearFilters}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Limpar
                </Button>
              ) : null}
              <Button
                type="button"
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setShowFilters((current) => !current)}
                aria-label="Mostrar filtros"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-3 rounded-lg border border-border/40 bg-muted/5 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_1fr]">
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Recorte</p>
                <Select value={type || "ALL"} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                <Select value={status || "ALL"} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVANCED_STATUS_FILTER_OPTIONS.map((option) => {
                      const count =
                        option.countKey === "total"
                          ? tasks.summary.total
                          : tasks.summary[option.countKey];

                      return (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border border-border/60 bg-background/80 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-foreground">
                  <span className="font-medium">
                    {isManualBacklogView
                      ? "Backlog operacional"
                      : isMonthlyView
                        ? "Rotinas mensais"
                        : "Visao consolidada"}
                  </span>
                  {competenceLabel && !isManualBacklogView ? (
                    <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                      Competencia {competenceLabel}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                    {status === "ALL"
                      ? "Todos os status"
                      : ADVANCED_STATUS_FILTER_OPTIONS.find((option) => option.value === status)?.label || status}
                  </span>
                  <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                    {isPending ? "Atualizando..." : `${tasks.pagination.total} registro(s)`}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isManualBacklogView
                    ? "Tarefas avulsas continuam visiveis ate serem concluidas ou canceladas."
                    : isMonthlyView
                      ? "Somente as rotinas da competencia selecionada aparecem nesta visao."
                      : "Rotinas mensais respeitam a competencia; tarefas avulsas permanecem no backlog."}
                </p>
              </div>
            </div>
            {hasActiveFilters ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <span>Busca e abas de status continuam sendo os filtros principais desta tela.</span>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {pageDescription}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {tasks.pagination.total > 0 ? (
            <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Exibindo <span className="font-medium text-foreground">{tasks.items.length}</span> de{" "}
                <span className="font-medium text-foreground">{tasks.pagination.total}</span> tarefas no filtro atual
              </span>
              <span>
                Pagina <span className="font-medium text-foreground">{tasks.pagination.page}</span> de{" "}
                <span className="font-medium text-foreground">
                  {Math.max(1, Math.ceil(tasks.pagination.total / tasks.pagination.pageSize))}
                </span>
              </span>
            </div>
          ) : null}

          {tasks.items.length === 0 ? (
            <RegistryEmptyState
              icon={CircleAlert}
              title="Nenhuma tarefa encontrada"
              description={
                hasActiveFilters
                  ? "Ajuste os filtros para ampliar o recorte ou limpe a busca atual."
                  : "Ative empresas na configuracao de rotina mensal ou crie tarefas avulsas para iniciar a fila."
              }
              searchTerm={search.trim() || undefined}
              onClear={hasActiveFilters ? clearFilters : undefined}
            />
          ) : (
            <RegistryTableCard>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow className="border-b border-border/60 hover:bg-transparent">
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tarefa</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato cliente</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vencimento</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checklist</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitacoes</TableHead>
                      <TableHead className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                      {canManage ? <TableHead className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acoes</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {tasks.items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "align-top cursor-pointer transition-colors hover:bg-muted/10",
                        selectedRowTaskId === item.id && "bg-primary/5 hover:bg-primary/10",
                      )}
                      onClick={() => setSelectedRowTaskId(item.id)}
                      onDoubleClick={() => setSelectedDetailsTaskId(item.id)}
                      title="Duplo clique para ver detalhes"
                    >
                      <TableCell className="w-[18%] px-3 py-4">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{item.companyName}</div>
                          <div className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[24%] px-3 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-foreground">{item.title}</div>
                            <Badge variant={getTaskTypeVariant(item.type)} className="gap-1">
                              {item.type === "ROTINA_MENSAL" ? <Repeat className="h-3 w-3" /> : <ListTodo className="h-3 w-3" />}
                              {getTaskTypeLabel(item.type)}
                            </Badge>
                          </div>
                          {item.year && item.month ? (
                            <div className="text-xs text-muted-foreground">
                              {String(item.month).padStart(2, "0")}/{item.year}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">Sem rotina mensal vinculada</div>
                          )}
                          {item.ticketId ? (
                            <Link
                              href={`/portal/tickets/${item.ticketId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              Ticket de origem
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="w-[12%] px-3 py-4 text-sm text-foreground">{item.clientContactName || "Nao definido"}</TableCell>
                      <TableCell className="w-[9%] px-3 py-4 text-sm text-foreground whitespace-nowrap">
                        {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="w-[8%] px-3 py-4 text-sm text-foreground whitespace-nowrap">
                        {item.requiredDocumentsCount} item(ns)
                      </TableCell>
                      <TableCell className="w-[15%] px-3 py-4">
                        {item.lastManualRequestAt ? (
                          <div className="space-y-1">
                            <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}>
                              {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              {item.lastManualRequestContactName || "Contato"} - {new Date(item.lastManualRequestAt).toLocaleString("pt-BR")}
                            </div>
                            <div className="text-xs text-muted-foreground">{item.manualRequestsCount} envio(s)</div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem disparos manuais</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[8%] px-3 py-4">
                        <Badge variant={getTaskStatusVariant(item.status)}>
                          {getTaskStatusLabel(item.status)}
                        </Badge>
                      </TableCell>
                      {canManage ? (
                        <TableCell className="w-[16%] px-3 py-4 text-right" onDoubleClick={(event) => event.stopPropagation()}>
                          <div className="flex flex-col items-end gap-2 xl:flex-row xl:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStatusTask(item)}
                          >
                            Atualizar status
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTask(item)}
                            disabled={item.availableContacts.length === 0}
                          >
                            <MessageSquareShare className="mr-2 h-4 w-4" />
                            {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo manual"}
                          </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            </RegistryTableCard>
          )}

          {tasks.pagination.total > 0 ? (
            <RegistryPagination
              pagination={{
                page: tasks.pagination.page,
                pageSize: tasks.pagination.pageSize,
                total: tasks.pagination.total,
                hasPreviousPage: tasks.pagination.hasPreviousPage,
                hasNextPage: tasks.pagination.hasNextPage,
              }}
              itemLabel={{ singular: "tarefa", plural: "tarefas" }}
              isLoading={isPending}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <TaskCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={() => router.refresh()}
      />

      <TaskManualRequestDialog
        item={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onSent={() => router.refresh()}
      />

      <TaskStatusDialog
        item={selectedStatusTask}
        open={Boolean(selectedStatusTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedStatusTask(null);
        }}
        onSaved={() => router.refresh()}
      />

      <TaskDetailsDialog
        itemId={selectedDetailsTaskId}
        open={Boolean(selectedDetailsTaskId)}
        onOpenChange={(open) => {
          if (!open) setSelectedDetailsTaskId(null);
        }}
      />
    </div>
  );
}
