"use client";

import Link from "next/link";
import { ChevronLeft as IconLeft, ChevronRight as IconRight, PlusCircle, Search } from "lucide-react";

import { TicketsStats } from "@/features/tickets/interface/components/TicketsStats";
import { TicketsFilters } from "@/features/tickets/interface/components/TicketsFilters";
import { TicketsTable } from "@/features/tickets/interface/components/TicketsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTicketFilters } from "@/features/tickets/interface/hooks/use-ticket-filters";
import { useTicketHotkeys } from "@/features/tickets/interface/hooks/use-ticket-hotkeys";
import type { ClosedTicketsWindow, TicketListItem, TicketStatusCounts, TicketsPagination, TicketTeamFilter } from "./types";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";

interface TicketsContainerProps {
  tickets: TicketListItem[];
  isAdmin: boolean;
  pagination: TicketsPagination;
  staleWarning?: string;
  queue: QueueKey;
  team: TicketTeamFilter;
  queueCounts: Record<QueueKey, number>;
  statusCounts: TicketStatusCounts;
  search: string;
  statusGroup: TicketStatusGroup;
  closedWindow: ClosedTicketsWindow;
}



export function TicketsContainer({
  tickets,
  isAdmin,
  pagination,
  staleWarning,
  queue,
  team,
  queueCounts,
  statusCounts,
  search,
  statusGroup,
  closedWindow,
}: TicketsContainerProps) {
  const {
    searchTerm,
    setSearchTerm,
    goToPage,
    setQueueFilter,
    setStatusFilter,
    setClosedWindowFilter,
    setTeamFilter,
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
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle>Dados em modo contingencia</AlertTitle>
          <AlertDescription>{staleWarning}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{isAdmin ? "Central de Atendimento" : "Meus Chamados"}</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            {isAdmin ? "Gerencie a fila de suporte e solicitacoes." : "Acompanhe o status das suas solicitacoes."}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/portal/tickets/novo">
            <Button className="h-10 w-full gap-2 shadow-sm sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir Novo Chamado</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        </div>
      </div>

      <TicketsStats counts={statusCounts} activeStatus={statusGroup} onSelectStatus={setStatusFilter} />

      <section className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <TicketsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusGroup}
            setStatusFilter={setStatusFilter}
            closedWindow={closedWindow}
            setClosedWindow={setClosedWindowFilter}
            isAdmin={isAdmin}
            counts={statusCounts}
            team={team}
            setTeamFilter={setTeamFilter}
            queue={queue}
            setQueueFilter={setQueueFilter}
            queueCounts={queueCounts}
          />

          <div className="flex flex-col gap-3 xl:items-end justify-start">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground xl:justify-end mt-2">
              <span className="inline-flex items-center gap-1">
                <Search className="h-3.5 w-3.5" />
                {pagination.total ?? tickets.length} filtrados
              </span>
            </div>
          </div>
        </div>
      </section>

      <TicketsTable tickets={tickets} isAdmin={isAdmin} />

      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Total filtrado: {pagination.total ?? tickets.length}</span>
        <span>Itens nesta pagina: {tickets.length}</span>
      </div>

      {(pagination.hasPreviousPage || pagination.hasNextPage) && (
        <div className="flex flex-wrap items-center justify-start gap-2 pt-2 sm:justify-end">
          <span className="w-full text-sm text-muted-foreground sm:mr-2 sm:w-auto">
            Pagina {pagination.page}
            {pagination.total !== null ? ` de ${Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}` : ""}
          </span>
          <Button variant="outline" size="icon" onClick={() => goToPage(pagination.page - 1)} disabled={!pagination.hasPreviousPage} className="h-8 w-8">
            <IconLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => goToPage(pagination.page + 1)} disabled={!pagination.hasNextPage} className="h-8 w-8">
            <IconRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
