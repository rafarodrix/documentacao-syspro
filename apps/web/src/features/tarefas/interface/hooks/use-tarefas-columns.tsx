import { useCallback, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { ExternalLink, ListTodo, MessageSquareShare, Repeat } from "lucide-react";
import { Badge, Button } from "@dosc-syspro/ui";
import type { TaskItem } from "@dosc-syspro/contracts/tarefas";
import { formatDateTime } from "@/lib/date";
import {
  formatTaskDueDate,
  getManualRequestStatusLabel,
  getManualRequestStatusVariant,
  getTaskStatusLabel,
  getTaskStatusVariant,
  getTaskTypeLabel,
  getTaskTypeVariant,
} from "../components/tarefas-page.helpers";

interface UseTarefasColumnsParams {
  canManage: boolean;
  setSelectedStatusTask: (item: TaskItem) => void;
  setSelectedTask: (item: TaskItem) => void;
}

export function useTarefasColumns({ canManage, setSelectedStatusTask, setSelectedTask }: UseTarefasColumnsParams) {
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
              <div className="text-xs text-muted-foreground">
                {item.accountingFirmName || "Sem contador vinculado"}
              </div>
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
                  {item.type === "ROTINA_MENSAL" ? (
                    <Repeat className="h-3 w-3" />
                  ) : (
                    <ListTodo className="h-3 w-3" />
                  )}
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
        cell: ({ row }) => formatTaskDueDate(row.original),
      },
      {
        accessorKey: "requiredDocumentsCount",
        header: "Checklist",
        meta: {
          className: "w-[8%] px-3 py-3.5 text-sm text-foreground whitespace-nowrap hidden xl:table-cell",
        },
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
              <Badge
                variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}
              >
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {item.lastManualRequestContactName || "Contato"} -{" "}
                {formatDateTime(item.lastManualRequestAt)}
              </div>
              <div className="text-xs text-muted-foreground">
                {item.manualRequestsCount} registro(s)
              </div>
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
  }, [canManage, setSelectedStatusTask, setSelectedTask]);

  const renderMobileItem = useCallback(
    (item: TaskItem) => (
      <div className="flex flex-col p-4 gap-3 bg-card/40 backdrop-blur-sm border border-border/40 rounded-lg m-2 animate-in fade-in duration-300">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-foreground leading-tight">{item.companyName}</h4>
            <p className="text-xs text-muted-foreground">
              {item.accountingFirmName || "Sem contador vinculado"}
            </p>
          </div>
          <Badge variant={getTaskStatusVariant(item.status)} className="shrink-0 text-[10px]">
            {getTaskStatusLabel(item.status)}
          </Badge>
        </div>

        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <Badge
              variant={getTaskTypeVariant(item.type)}
              className="text-[10px] gap-0.5 px-1.5 py-0"
            >
              {item.type === "ROTINA_MENSAL" ? (
                <Repeat className="h-2.5 w-2.5" />
              ) : (
                <ListTodo className="h-2.5 w-2.5" />
              )}
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
            Vencimento:{" "}
            <span className="font-medium text-foreground">{formatTaskDueDate(item)}</span>
          </div>
          <div>
            Checklist:{" "}
            <span className="font-medium text-foreground">
              {item.requiredDocumentsCount} item(ns)
            </span>
          </div>
        </div>

        {item.lastManualRequestAt ? (
          <div className="text-[11px] border-t border-border/40 pt-2 text-muted-foreground space-y-1">
            <div className="flex items-center gap-1">
              <span>Último disparo:</span>
              <Badge
                variant={getManualRequestStatusVariant(item.lastManualRequestStatus || "FAILED")}
                className="text-[9px] px-1 py-0 h-4"
              >
                {getManualRequestStatusLabel(item.lastManualRequestStatus || "FAILED")}
              </Badge>
            </div>
            <p>
              {item.lastManualRequestContactName || "Contato"} -{" "}
              {formatDateTime(item.lastManualRequestAt)} ({item.manualRequestsCount} disparos)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Sem disparos manuais</p>
        )}

        {canManage && (
          <div
            className="flex justify-end gap-2 border-t border-border/40 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
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
    [canManage, setSelectedStatusTask, setSelectedTask],
  );

  return { columns, renderMobileItem };
}
