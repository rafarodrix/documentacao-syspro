"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft as IconLeft, ChevronRight as IconRight, Download as DownloadIcon, PlusCircle } from "lucide-react";

import { TicketsStats } from "@/features/tickets/interface/components/TicketsStats";
import { TicketsFilters } from "@/features/tickets/interface/components/TicketsFilters";
import { TicketsTable } from "@/features/tickets/interface/components/TicketsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { downloadCsv } from "@/features/tickets/application/utils";
import type { ClosedTicketsWindow, TicketListItem, TicketStatusCounts, TicketsPagination } from "./types";
import type { QueueKey, TicketStatusGroup } from "@dosc-syspro/core";

interface TicketsContainerProps {
  tickets: TicketListItem[];
  isAdmin: boolean;
  pagination: TicketsPagination;
  staleWarning?: string;
  queue: QueueKey;
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
  queueCounts,
  statusCounts,
  search,
  statusGroup,
  closedWindow,
}: TicketsContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(search);

  useEffect(() => {
    setSearchTerm(search);
  }, [search]);

  useEffect(() => {
    const nextValue = searchTerm.trim();
    const currentValue = (searchParams?.get("search") || "").trim();
    if (nextValue === currentValue) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (nextValue) {
        params.set("search", nextValue);
      } else {
        params.delete("search");
      }
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }, 250);

    return () => clearTimeout(timer);
  }, [pathname, router, searchParams, searchTerm]);

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToPage = (nextPage: number) => {
    updateParams((params) => {
      params.set("page", String(Math.max(1, nextPage)));
    });
  };

  const setQueueFilter = (nextQueue: QueueKey) => {
    updateParams((params) => {
      params.set("queue", nextQueue);
      params.set("page", "1");
    });
  };

  const setStatusFilter = (nextStatus: TicketStatusGroup) => {
    updateParams((params) => {
      if (nextStatus === "open") {
        params.delete("status");
      } else {
        params.set("status", nextStatus);
      }
      params.set("page", "1");
    });
  };

  const setClosedWindowFilter = (nextWindow: ClosedTicketsWindow) => {
    updateParams((params) => {
      if (nextWindow === "30d") {
        params.delete("closedWindow");
      } else {
        params.set("closedWindow", nextWindow);
      }
      params.set("page", "1");
    });
  };

  const handleExportCsv = () => {
    if (!tickets || tickets.length === 0) return;
    const csvRows = tickets.map((t) => ({
      "ID Chamado": t.id,
      Numero: t.number,
      Assunto: t.title,
      Grupo: t.group,
      Status: t.statusLabel,
      Prioridade: t.priority,
      Cliente: t.customer,
      "Data de Criacao": new Date(t.createdAt).toLocaleString("pt-BR"),
      "Ultima Atualizacao": new Date(t.updatedAt).toLocaleString("pt-BR"),
      "Estourou SLA?": t.slaBreached ? "Sim" : "Nao",
    }));
    const exportedDate = new Date().toISOString().split("T")[0];
    downloadCsv(`exportacao_chamados_${exportedDate}.csv`, csvRows);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-10 duration-700">
      {staleWarning && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle>Dados em modo contingencia</AlertTitle>
          <AlertDescription>{staleWarning}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{isAdmin ? "Central de Atendimento" : "Meus Chamados"}</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            {isAdmin ? "Gerencie a fila de suporte e solicitacoes." : "Acompanhe o status das suas solicitacoes."}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/portal/tickets/novo">
            <Button className="h-10 w-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-linear-to-r from-primary to-primary/90 gap-2 sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Abrir Novo Chamado</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        </div>
      </div>

      <TicketsStats counts={statusCounts} activeStatus={statusGroup} onSelectStatus={setStatusFilter} />

      {isAdmin && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              <Button variant={queue === "my_queue" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("my_queue")}>
                Minha fila ({queueCounts.my_queue})
              </Button>
              <Button variant={queue === "unassigned" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("unassigned")}>
                Sem dono ({queueCounts.unassigned})
              </Button>
              <Button variant={queue === "critical" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("critical")}>
                Criticos ({queueCounts.critical})
              </Button>
              <Button variant={queue === "no_response" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("no_response")}>
                Sem resposta ({queueCounts.no_response})
              </Button>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full gap-2 sm:w-auto" onClick={handleExportCsv} disabled={tickets.length === 0}>
              <DownloadIcon className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      )}

      <TicketsFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusGroup}
        setStatusFilter={setStatusFilter}
        closedWindow={closedWindow}
        setClosedWindow={setClosedWindowFilter}
        isAdmin={isAdmin}
        counts={statusCounts}
      />

      <TicketsTable tickets={tickets} isAdmin={isAdmin} />

      <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
