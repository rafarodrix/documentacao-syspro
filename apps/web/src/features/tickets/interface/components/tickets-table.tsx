"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, Building2, Code2, Headphones, SearchX } from "lucide-react";
import { formatRelativeDate, formatAbsoluteDate } from "@/lib/utils";
import { Button, Tooltip, TooltipContent, TooltipTrigger, DataTable } from "@dosc-syspro/ui";
import { type ColumnDef } from "@tanstack/react-table";
import type { TicketListItem, TicketSortBy, TicketSortOrder } from "./ticket-view.types";
import type { TicketStatusGroup } from "@dosc-syspro/core";
import { StatusBadge, PriorityBadge } from "./ticket-badges";
import { humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";

interface TicketsTableProps {
  tickets: TicketListItem[];
  canManageTickets: boolean;
  statusGroup: TicketStatusGroup;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  onSortChange: (sortBy: TicketSortBy, sortOrder: TicketSortOrder) => void;
}

export function TicketsTable({
  tickets,
  canManageTickets,
  statusGroup,
  sortBy,
  sortOrder,
  onSortChange,
}: TicketsTableProps) {
  const router = useRouter();
  const ticketSettings = useTicketModuleSettings();
  const isClosedView = statusGroup === "closed";
  const isOpenView = statusGroup === "open";

  // Configuração das Colunas usando ColumnDef do TanStack Table
  const columns = React.useMemo<ColumnDef<TicketListItem>[]>(() => {
    const cols: ColumnDef<TicketListItem>[] = [
      {
        id: "number",
        header: "Ticket",
        cell: ({ row }) => (
          <span className="rounded-md border border-border/50 bg-background px-2 py-1 font-mono text-[11px] font-medium text-muted-foreground">
            #{row.original.number}
          </span>
        ),
      },
      {
        id: "subject",
        header: () => (
          <SortButton
            label="Assunto"
            active={sortBy === "subject"}
            direction={sortOrder}
            onClick={() => toggleSort("subject", sortBy, sortOrder, onSortChange)}
          />
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="max-w-96 truncate text-sm font-medium text-foreground">
              {row.original.title}
            </span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
              {humanizeModuleHierarchyValue(row.original.module) || row.original.group}
            </span>
          </div>
        ),
      },
    ];

    if (canManageTickets) {
      cols.push({
        id: "customer",
        header: () => (
          <SortButton
            label="Cliente"
            active={sortBy === "customer"}
            direction={sortOrder}
            onClick={() => toggleSort("customer", sortBy, sortOrder, onSortChange)}
          />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition-colors">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="max-w-52 truncate text-sm text-foreground">
                {row.original.companyName || row.original.customer}
              </span>
              {row.original.companyName && row.original.contactName && (
                <span className="max-w-52 truncate text-[11px] text-muted-foreground">
                  {row.original.contactName}
                </span>
              )}
            </div>
          </div>
        ),
      });
    }

    cols.push({
      id: "category",
      header: "Categoria",
      meta: { className: "hidden xl:table-cell" },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {resolveCategoryLabel(ticketSettings.categories, row.original.category)}
        </span>
      ),
    });

    cols.push({
      id: "team",
      header: "Equipe",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => <TeamBadge team={row.original.team} />,
    });

    if (!isClosedView && !isOpenView) {
      cols.push({
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.statusLabel} rawStatus={row.original.status} />
        ),
      });
    }

    if (!isClosedView) {
      cols.push({
        id: "priority",
        header: "Prioridade",
        meta: { className: "hidden xl:table-cell" },
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      });
    }

    if (isClosedView) {
      cols.push({
        id: "resolvedBy",
        header: "Resolvido por",
        meta: { className: "hidden xl:table-cell" },
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.resolvedByName || "Não informado"}
          </span>
        ),
      });
    }

    cols.push({
      id: "updatedAt",
      header: () => (
        <SortButton
          label={isClosedView ? "Resolvido em" : "Atualização"}
          active={sortBy === "updatedAt"}
          direction={sortOrder}
          onClick={() => toggleSort("updatedAt", sortBy, sortOrder, onSortChange)}
        />
      ),
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => {
        const dateVal = isClosedView ? row.original.resolvedAt || row.original.updatedAt : row.original.updatedAt;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default text-xs text-muted-foreground whitespace-nowrap">
                {formatRelativeDate(dateVal)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-mono text-xs">
              {formatAbsoluteDate(dateVal)}
            </TooltipContent>
          </Tooltip>
        );
      },
    });

    cols.push({
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2.5 hover:bg-primary/10 hover:text-primary">
            <Link href={`/portal/tickets/${row.original.id}`} onClick={(e) => e.stopPropagation()}>
              <span className="hidden sm:inline mr-1 text-xs font-medium">Abrir</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      ),
    });

    return cols;
  }, [
    canManageTickets,
    isClosedView,
    isOpenView,
    sortBy,
    sortOrder,
    ticketSettings.categories,
    onSortChange,
  ]);

  // Renderização Customizada Híbrida para Visualização Mobile
  const renderMobileItem = React.useCallback(
    (ticket: TicketListItem) => (
      <div
        className="cursor-pointer space-y-3 p-4 transition-colors hover:bg-muted/10"
        onClick={() => router.push(`/portal/tickets/${ticket.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{ticket.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              #{ticket.number} - {ticket.group}
            </p>
          </div>
          {!isClosedView && !isOpenView && (
            <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
          )}
        </div>
        {canManageTickets && (
          <div className="flex flex-col gap-0">
            <p className="text-xs text-foreground truncate">{ticket.companyName || ticket.customer}</p>
            {ticket.companyName && ticket.contactName && (
              <p className="text-[11px] text-muted-foreground truncate">{ticket.contactName}</p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <TeamBadge team={ticket.team} />
          {ticket.category ? (
            <span className="rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {resolveCategoryLabel(ticketSettings.categories, ticket.category)}
            </span>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-muted-foreground ml-auto cursor-default">
                {formatRelativeDate(ticket.updatedAt)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-mono text-xs">
              {formatAbsoluteDate(ticket.updatedAt)}
            </TooltipContent>
          </Tooltip>
        </div>
        {isClosedView && ticket.resolvedByName ? (
          <p className="text-[11px] text-muted-foreground">Resolvido por {ticket.resolvedByName}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <Link href={`/portal/tickets/${ticket.id}`}>Abrir</Link>
          </Button>
        </div>
      </div>
    ),
    [canManageTickets, isClosedView, isOpenView, router, ticketSettings.categories]
  );

  const emptyStateConfig = React.useMemo(
    () => ({
      title: "Nenhum chamado encontrado",
      description: "Tente ajustar os filtros ou busque por outro termo.",
      icon: SearchX,
    }),
    []
  );

  return (
    <DataTable
      columns={columns}
      data={tickets}
      flexible={true}
      sorting={{
        sortBy,
        sortOrder,
        onSortChange,
      }}
      onRowClick={(ticket) => router.push(`/portal/tickets/${ticket.id}`)}
      emptyState={emptyStateConfig}
      renderMobileItem={renderMobileItem}
    />
  );
}

function resolveCategoryLabel(
  categories: Array<{ value: string; label: string }>,
  category?: string | null
) {
  const normalized = (category || "").trim();
  if (!normalized) return "Não definida";
  const configured = categories.find((item) => item.value.toLowerCase() === normalized.toLowerCase());
  return configured?.label || humanizeModuleHierarchyValue(normalized) || normalized;
}

function SortButton({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: TicketSortOrder;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      <span>{label}</span>
      <Icon className="h-3 w-3" />
    </button>
  );
}

function toggleSort(
  column: TicketSortBy,
  currentSortBy: TicketSortBy,
  currentSortOrder: TicketSortOrder,
  onSortChange: (sortBy: TicketSortBy, sortOrder: TicketSortOrder) => void
) {
  if (currentSortBy === column) {
    onSortChange(column, currentSortOrder === "asc" ? "desc" : "asc");
    return;
  }

  onSortChange(column, column === "updatedAt" ? "desc" : "asc");
}

function TeamBadge({ team }: { team?: TicketListItem["team"] }) {
  if (team === "DESENVOLVIMENTO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground">
        <Code2 className="h-3 w-3" /> Dev
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2 py-1 text-[10px] font-semibold text-foreground">
      <Headphones className="h-3 w-3" /> Suporte
    </span>
  );
}
