"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { TicketsFilters } from "@/features/tickets/interface/components/tickets-filters";
import { TicketsTable } from "@/features/tickets/interface/components/tickets-table";
import { Button } from "@dosc-syspro/ui";
import { PageHeader, PageShell, StaleState } from "@/components/patterns";
import { RegistryDataTable } from "@/components/platform/shared/registry-list-scaffold";
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
    <PageShell>
      {staleWarning ? <StaleState message={staleWarning} /> : null}

      <PageHeader
        title={canManageTickets ? "Tickets" : "Meus chamados"}
        description={
          canManageTickets ? "Gerencie a fila de suporte e desenvolvimento." : "Acompanhe o status das suas solicitacoes."
        }
        actions={
          <Link href="/portal/tickets/novo" className="w-full sm:w-auto">
            <Button className="h-10 w-full gap-2 sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Novo chamado</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        }
      />

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

      <RegistryDataTable
        wrapInCard={false}
        isEmpty={false}
        emptyState={{
          icon: PlusCircle,
          title: "Nenhum ticket encontrado",
          description: "Ajuste os filtros para refinar a listagem.",
        }}
        desktopColSpan={1}
        content={
          <TicketsTable
            tickets={tickets}
            canManageTickets={canManageTickets}
            statusGroup={statusGroup}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={setSort}
            pagination={pagination}
          />
        }
        pagination={
          pagination.total !== null
            ? {
                pagination: { ...pagination, total: pagination.total },
                itemLabel: { singular: "ticket", plural: "tickets" },
                onPageChange: goToPage,
              }
            : undefined
        }
      />

      {pagination.total === null ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Total filtrado indisponivel</span>
          <span>Itens nesta pagina: {tickets.length}</span>
        </div>
      ) : null}
    </PageShell>
  );
}
