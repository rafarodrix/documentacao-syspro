"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { TicketsFilters } from "@/features/tickets/interface/components/tickets-filters";
import { TicketsTable } from "@/features/tickets/interface/components/tickets-table";
import { Button, Alert, AlertDescription, AlertTitle } from "@dosc-syspro/ui";
import { RegistryPagination } from "@/components/platform/shared/registry-list-scaffold";
import { useTicketFilters } from "@/features/tickets/interface/hooks/use-ticket-filters";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import type { ClosedTicketsWindow, TicketListItem, TicketSortBy, TicketSortOrder, TicketStatusCounts, TicketsPagination, TicketTeamFilter } from "./ticket-view.types";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";

interface TicketsContainerProps {
  tickets: TicketListItem[];
  canManageTickets: boolean;
  pagination: TicketsPagination;
  staleWarning?: string;
  queue: QueueKey;
  team: TicketTeamFilter;
  queueCounts: Record<QueueKey, number>;
  statusCounts: TicketStatusCounts;
  search: string;
  statusGroup: TicketStatusGroup;
  closedWindow: ClosedTicketsWindow;
  category: string;
  module: string;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
}



export function TicketsContainer({
  tickets,
  canManageTickets,
  pagination,
  staleWarning,
  queue,
  team,
  queueCounts,
  statusCounts,
  search,
  statusGroup,
  closedWindow,
  category,
  module,
  sortBy,
  sortOrder,
}: TicketsContainerProps) {
  const {
    searchTerm,
    setSearchTerm,
    goToPage,
    setQueueFilter,
    setStatusFilter,
    setClosedWindowFilter,
    setTeamFilter,
    setCategoryFilter,
    setModuleFilter,
    setSort,
  } = useTicketFilters(search);

  useTicketHotkeys({
    onSearch: () => {
      const searchInput = document.getElementById("global-ticket-search");
      if (searchInput) {
        searchInput.focus();
      }
    },
  });


  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 pb-8 duration-700">
      {staleWarning && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTitle>Dados em modo contingencia</AlertTitle>
          <AlertDescription>{staleWarning}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{canManageTickets ? "Tickets" : "Meus chamados"}</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            {canManageTickets ? "Gerencie a fila de suporte e desenvolvimento." : "Acompanhe o status das suas solicitacoes."}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/portal/tickets/novo" className="w-full sm:w-auto">
            <Button className="h-10 w-full gap-2 sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Novo chamado</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-border/60 bg-card p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <TicketsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusGroup}
            setStatusFilter={setStatusFilter}
            closedWindow={closedWindow}
            setClosedWindow={setClosedWindowFilter}
            canManageTickets={canManageTickets}
            counts={statusCounts}
            team={team}
            setTeamFilter={setTeamFilter}
            queue={queue}
            setQueueFilter={setQueueFilter}
            queueCounts={queueCounts}
            category={category}
            setCategoryFilter={setCategoryFilter}
            module={module}
            setModuleFilter={setModuleFilter}
          />


        </div>
      </section>

      {pagination.total !== null && tickets.length > 0 && (
        <p className="px-0.5 text-xs text-muted-foreground">
          Exibindo{" "}
          <span className="font-medium text-foreground">
            {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)}
          </span>{" "}
          de{" "}
          <span className="font-medium text-foreground">{pagination.total}</span>{" "}
          {pagination.total === 1 ? "ticket" : "tickets"}
        </p>
      )}

      <TicketsTable
        tickets={tickets}
        canManageTickets={canManageTickets}
        statusGroup={statusGroup}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSort}
      />

      {pagination.total !== null ? (
        <RegistryPagination
          pagination={{ ...pagination, total: pagination.total }}
          itemLabel={{ singular: "ticket", plural: "tickets" }}
          onPageChange={goToPage}
        />
      ) : (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Total filtrado indisponivel</span>
          <span>Itens nesta pagina: {tickets.length}</span>
        </div>
      )}
    </div>
  );
}
