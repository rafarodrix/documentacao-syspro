"use client";

import { trpc } from "@/lib/api/trpc-client";
import {
  RegistryFilterGroup,
  RegistryToolbar,
  RegistryPagination,
} from "@/components/platform/shared/registry-list-scaffold";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/patterns";
import type { TaskItem, TaskItemListResponse } from "@dosc-syspro/contracts/tarefas";
import {
  Badge,
  Button,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@dosc-syspro/ui";
import { CircleAlert, ExternalLink, Filter, ListTodo, MessageSquareShare, Plus, RefreshCw, Repeat, Search, X, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { formatDateShort, formatDateTime } from "@/lib/date";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
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
  origin: string;
  year: string;
  month: string;
  dueFrom: string;
  dueTo: string;
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
  { value: "OPEN", label: "Em aberto", countKey: "open" },
  { value: "PENDING", label: "Pendentes", countKey: "pending" },
  { value: "WAITING_CUSTOMER", label: "Aguardando cliente", countKey: "waitingCustomer" },
  { value: "RECEIVED", label: "Recebidas", countKey: "received" },
  { value: "SENT_TO_ACCOUNTING", label: "Enviadas", countKey: "sentToAccounting" },
  { value: "OVERDUE", label: "Atrasadas", countKey: "overdue" },
] as const;

const ADVANCED_STATUS_FILTER_OPTIONS = [
  ...STATUS_FILTER_OPTIONS,
  { value: "ALL", label: "Todas", countKey: "total" },
  { value: "COMPLETED", label: "Concluidas", countKey: "completed" },
  { value: "CANCELED", label: "Canceladas", countKey: "canceled" },
] as const;

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "ROTINA_MENSAL", label: "Rotinas mensais" },
  { value: "TAREFA", label: "Tarefas avulsas" },
] as const;

const ORIGIN_FILTER_OPTIONS = [
  { value: "ALL", label: "Todas as origens" },
  { value: "MONTHLY", label: "Rotina mensal" },
  { value: "MANUAL", label: "Manual" },
  { value: "TICKET", label: "Ticket" },
] as const;

export function TarefasPage({ tasks, search, status, type, origin, year, month, dueFrom, dueTo, canManage }: TarefasPageProps) {
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

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    clientContactName: true,
    dueDate: true,
    requiredDocumentsCount: true,
    requests: true,
    status: true,
  });

  const columns = useMemo<ColumnDef<TaskItem>[]>(() => {
    const cols: ColumnDef<TaskItem>[] = [
      {
        accessorKey: "companyName",
        header: "Empresa",
        meta: { className: "w-[18%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium text-foreground">{item.companyName}</div>
              <div className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Tarefa",
        meta: { className: "w-[24%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
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
                  onClick={(e) => e.stopPropagation()}
                >
                  Ticket de origem
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "clientContactName",
        header: "Contato cliente",
        meta: { className: "w-[12%] px-3 py-3.5 text-sm text-foreground hidden lg:table-cell" },
        cell: ({ row }) => row.original.clientContactName || "Não definido",
      },
      {
        accessorKey: "dueDate",
        header: "Vencimento",
        meta: { className: "w-[9%] px-3 py-3.5 text-sm text-foreground whitespace-nowrap" },
        cell: ({ row }) => formatDateShort(row.original.dueDate),
      },
      {
        accessorKey: "requiredDocumentsCount",
        header: "Checklist",
        meta: { className: "w-[8%] px-3 py-3.5 text-sm text-foreground whitespace-nowrap hidden xl:table-cell" },
        cell: ({ row }) => `${row.original.requiredDocumentsCount} item(ns)`,
      },
      {
        id: "requests",
        header: "Solicitações",
        enableSorting: false,
        meta: { className: "w-[15%] px-3 py-3.5 hidden lg:table-cell" },
        cell: ({ row }) => {
          const item = row.original;
          return item.lastManualRequestAt ? (
            <div className="space-y-1">
              <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}>
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {item.lastManualRequestContactName || "Contato"} - {formatDateTime(item.lastManualRequestAt)}
              </div>
              <div className="text-xs text-muted-foreground">{item.manualRequestsCount} registro(s)</div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Sem disparos manuais</span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { className: "w-[8%] px-3 py-3.5" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Badge variant={getTaskStatusVariant(item.status)}>
              {getTaskStatusLabel(item.status)}
            </Badge>
          );
        },
      },
    ];

    if (canManage) {
      cols.push({
        id: "actions",
        header: "Ações",
        enableSorting: false,
        meta: { className: "w-[16%] px-3 py-3.5 text-right" },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div 
              className="flex flex-col items-end gap-2 xl:flex-row xl:justify-end"
              onDoubleClick={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedStatusTask(item)}
              >
                Atualizar status
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setSelectedTask(item)}
                disabled={item.availableContacts.length === 0}
              >
                <MessageSquareShare className="mr-2 h-4 w-4" />
                {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo manual"}
              </Button>
            </div>
          );
        },
      });
    }

    return cols;
  }, [canManage, selectedRowTaskId]);

  const renderMobileItem = useCallback(
    (item: TaskItem) => (
      <div className="flex flex-col p-4 gap-3 bg-card/40 backdrop-blur-sm border border-border/40 rounded-lg m-2 animate-in fade-in duration-300">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-foreground leading-tight">{item.companyName}</h4>
            <p className="text-xs text-muted-foreground">{item.accountingFirmName || "Sem contador vinculado"}</p>
          </div>
          <Badge variant={getTaskStatusVariant(item.status)} className="shrink-0 text-[10px]">
            {getTaskStatusLabel(item.status)}
          </Badge>
        </div>

        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <Badge variant={getTaskTypeVariant(item.type)} className="text-[10px] gap-0.5 px-1.5 py-0">
              {item.type === "ROTINA_MENSAL" ? <Repeat className="h-2.5 w-2.5" /> : <ListTodo className="h-2.5 w-2.5" />}
              {getTaskTypeLabel(item.type)}
            </Badge>
          </div>
          {item.year && item.month ? (
            <span className="text-xs text-muted-foreground block">
              Competência: {String(item.month).padStart(2, "0")}/{item.year}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground block">Sem rotina mensal vinculada</span>
          )}
          {item.ticketId && (
            <Link
              href={`/portal/tickets/${item.ticketId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Ticket de origem
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
          <div>
            Vencimento: <span className="font-medium text-foreground">{formatDateShort(item.dueDate)}</span>
          </div>
          <div>
            Checklist: <span className="font-medium text-foreground">{item.requiredDocumentsCount} item(ns)</span>
          </div>
        </div>

        {item.lastManualRequestAt ? (
          <div className="text-[11px] border-t border-border/40 pt-2 text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <span>Último disparo:</span>
              <Badge variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")} className="text-[9px] px-1 py-0 h-4">
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
            </div>
            <p>
              {item.lastManualRequestContactName || "Contato"} - {formatDateTime(item.lastManualRequestAt)} ({item.manualRequestsCount} disparos)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Sem disparos manuais</p>
        )}

        {canManage && (
          <div className="flex justify-end gap-2 border-t border-border/40 pt-3" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs py-1 px-3"
              onClick={() => setSelectedStatusTask(item)}
            >
              Atualizar status
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs py-1 px-3"
              onClick={() => setSelectedTask(item)}
              disabled={item.availableContacts.length === 0}
            >
              <MessageSquareShare className="mr-1 h-3 w-3" />
              {item.manualRequestsCount > 0 ? "Reenviar" : "Disparo"}
            </Button>
          </div>
        )}
      </div>
    ),
    [canManage]
  );

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
      if (nextStatus && nextStatus !== "ALL" && nextStatus !== "OPEN") {
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

      if (nextType === "TAREFA" && params.get("origin") === "MONTHLY") {
        params.delete("origin");
      }

      if (nextType === "ROTINA_MENSAL") {
        const currentOrigin = params.get("origin");
        if (currentOrigin === "MANUAL" || currentOrigin === "TICKET") {
          params.set("origin", "MONTHLY");
        }
      }

      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const setOriginFilter = (nextOrigin: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextOrigin && nextOrigin !== "ALL") {
        params.set("origin", nextOrigin);
      } else {
        params.delete("origin");
      }

      if (nextOrigin === "MANUAL" || nextOrigin === "TICKET") {
        params.set("type", "TAREFA");
      }

      if (nextOrigin === "MONTHLY") {
        params.set("type", "ROTINA_MENSAL");
      }

      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const setCompetenceFilter = (nextValue: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue) {
        const [nextYear, nextMonth] = nextValue.split("-");
        if (nextYear) params.set("year", nextYear);
        if (nextMonth) params.set("month", String(Number(nextMonth)));
      } else {
        params.delete("year");
        params.delete("month");
      }
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const setDueDateFilter = (key: "dueFrom" | "dueTo", value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
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
      params.delete("origin");
      params.delete("year");
      params.delete("month");
      params.delete("dueFrom");
      params.delete("dueTo");
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const currentMonthValue = `${year}-${String(Number(month)).padStart(2, "0")}`;
  const now = new Date();
  const defaultMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hasActiveFilters =
    Boolean(search.trim()) ||
    status !== "OPEN" ||
    type !== "ALL" ||
    origin !== "ALL" ||
    currentMonthValue !== defaultMonthValue ||
    Boolean(dueFrom) ||
    Boolean(dueTo);

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
  const shouldUseCompetenceFilter = origin === "MONTHLY" || (origin === "ALL" && type !== "TAREFA");
  const shouldUseOperationalDueFilter = origin === "MANUAL" || origin === "TICKET" || type === "TAREFA";

  const statusFilterOptions = STATUS_FILTER_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    count: tasks.summary[option.countKey],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        description="Gerencie rotinas mensais por competencia e tarefas avulsas como backlog operacional continuo."
        actions={
          canManage ? (
            <>
              <Button type="button" onClick={() => setIsCreateDialogOpen(true)} className="h-10 w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Nova tarefa
              </Button>
              {!isManualBacklogView ? (
                <Button type="button" variant="outline" onClick={handleSyncMonth} disabled={isSyncing} className="h-10 w-full gap-2 sm:w-auto">
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Sincronizando..." : "Sincronizar rotinas do mes"}
                </Button>
              ) : null}
            </>
          ) : null
        }
      />
      <RegistryToolbar
        searchValue={searchDraft}
        searchPlaceholder="Buscar por empresa, tarefa, contato ou contador..."
        onSearchChange={setSearchDraft}
        onClearSearch={() => setSearchDraft("")}
        resultLabel={`${tasks.pagination.total} filtradas`}
        filters={
          <RegistryFilterGroup
            value={status || "OPEN"}
            onChange={setStatusFilter}
            options={statusFilterOptions}
          />
        }
        actions={
          <>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
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
              className="h-9 w-9"
              onClick={() => setShowFilters((current) => !current)}
              aria-label="Mostrar filtros"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {showFilters ? (
        <div className="rounded-lg border border-border/40 bg-background p-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,15rem)_minmax(0,15rem)_minmax(0,15rem)_minmax(0,15rem)]">
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
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Origem</p>
              <Select value={origin || "ALL"} onValueChange={setOriginFilter}>
                <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGIN_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
              <Select value={status || "OPEN"} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 border-border/60 bg-background text-sm">
                  <SelectValue placeholder="Em aberto" />
                </SelectTrigger>
                <SelectContent>
                  {ADVANCED_STATUS_FILTER_OPTIONS.map((option) => {
                    const count = option.countKey
                      ? option.countKey === "total"
                        ? tasks.summary.total
                        : tasks.summary[option.countKey]
                      : null;

                    return (
                      <SelectItem key={option.value} value={option.value}>
                        {count == null ? option.label : `${option.label} (${count})`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                {shouldUseCompetenceFilter ? "Competência mensal" : "Vencimento inicial"}
              </p>
              {shouldUseCompetenceFilter ? (
                <Input
                  type="month"
                  value={currentMonthValue}
                  onChange={(event) => setCompetenceFilter(event.target.value)}
                  className="h-9 border-border/60 bg-background text-sm"
                />
              ) : (
                <Input
                  type="date"
                  value={dueFrom}
                  onChange={(event) => setDueDateFilter("dueFrom", event.target.value)}
                  className="h-9 border-border/60 bg-background text-sm"
                />
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                {shouldUseCompetenceFilter ? "Competência aplicada" : "Vencimento final"}
              </p>
              {shouldUseCompetenceFilter ? (
                <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-muted-foreground">
                  {competenceLabel ? `Rotinas em ${competenceLabel}` : "Sem competência ativa"}
                </div>
              ) : (
                <Input
                  type="date"
                  value={dueTo}
                  onChange={(event) => setDueDateFilter("dueTo", event.target.value)}
                  className="h-9 border-border/60 bg-background text-sm"
                />
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Periodo operacional</p>
              <div className="flex h-9 items-center rounded-md border border-border/60 bg-background px-3 text-sm text-muted-foreground">
                {!shouldUseOperationalDueFilter
                  ? "Rotinas usam competência mensal"
                  : dueFrom || dueTo
                    ? `Vencimento ${dueFrom || "..."} até ${dueTo || "..."}`
                    : "Sem intervalo de vencimento aplicado"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {/* Barra de Ferramentas da Tabela: Exibição & Colunas (Coesão de Layout Premium) */}
        <div className="flex items-center justify-between px-0.5">
          <div className="text-xs text-muted-foreground font-medium">
            {tasks.pagination.total > 0 && tasks.items.length > 0 && (
              <span>
                Exibindo{" "}
                <span className="font-semibold text-foreground">
                  {(tasks.pagination.page - 1) * tasks.pagination.pageSize + 1}–
                  {Math.min(tasks.pagination.page * tasks.pagination.pageSize, tasks.pagination.total)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-foreground">{tasks.pagination.total}</span>{" "}
                {tasks.pagination.total === 1 ? "tarefa" : "tarefas"}
              </span>
            )}
          </div>
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-border/60 bg-background/50 hover:bg-muted/50 text-xs shadow-sm transition-all duration-200"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                  <span>Colunas</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-card/95 backdrop-blur-md border border-border/40 shadow-xl animate-in fade-in duration-200">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5 py-1.5">
                  Exibir Colunas
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40 mx-1" />
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.clientContactName}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, clientContactName: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Contato cliente
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.dueDate}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, dueDate: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Vencimento
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.requiredDocumentsCount}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, requiredDocumentsCount: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Checklist
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.requests}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, requests: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Solicitações
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={columnVisibility.status}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, status: !!checked }))
                  }
                  className="text-xs focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer"
                >
                  Status
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={tasks.items}
          loading={isPending}
          loadingLabel="Carregando tarefas..."
          emptyState={{
            title: "Nenhuma tarefa encontrada",
            description: hasActiveFilters
              ? "Ajuste os filtros para ampliar o recorte ou limpe a busca atual."
              : "Ative empresas na configuracao de rotina mensal ou crie tarefas avulsas para iniciar a fila.",
            icon: CircleAlert,
          }}
          flexible={true}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          onRowClick={(row) => setSelectedRowTaskId(row.id)}
          onRowDoubleClick={(row) => setSelectedDetailsTaskId(row.id)}
          rowClassName={(row) => cn(
            "align-top cursor-pointer",
            selectedRowTaskId === row.id && "bg-primary/5 hover:bg-primary/10"
          )}
          renderMobileItem={renderMobileItem}
        />
      </div>

      {tasks.pagination.total > 0 && (
        <div className="mt-4">
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
        </div>
      )}

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
