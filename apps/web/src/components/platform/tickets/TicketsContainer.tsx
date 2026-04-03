"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft as IconLeft, ChevronRight as IconRight } from "lucide-react";
import { TicketSheet } from "@/components/platform/tickets/TicketSheet";
import { TicketsStats } from "./TicketsStats";
import { TicketsFilters } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-10 duration-700">
            {staleWarning && (
                <Alert className="border-amber-500/40 bg-amber-500/10">
                    <AlertTitle>Dados em modo contingencia</AlertTitle>
                    <AlertDescription>{staleWarning}</AlertDescription>
                </Alert>
            )}

            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {isAdmin ? "Central de Atendimento" : "Meus Chamados"}
                    </h1>
                    <p className="mt-1 text-lg text-muted-foreground">
                        {isAdmin ? "Gerencie a fila de suporte e solicitacoes." : "Acompanhe o status das suas solicitacoes."}
                    </p>
                </div>
                <TicketSheet isSystemUser={isAdmin} />
            </div>

            <TicketsStats counts={statusCounts} activeStatus={statusGroup} onSelectStatus={setStatusFilter} />

            {isAdmin && (
                <div className="flex flex-wrap gap-2">
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

            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total filtrado: {pagination.total ?? tickets.length}</span>
                <span>Itens nesta pagina: {tickets.length}</span>
            </div>

            {(pagination.hasPreviousPage || pagination.hasNextPage) && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <span className="mr-2 text-sm text-muted-foreground">
                        Pagina {pagination.page}
                        {pagination.total !== null ? ` de ${Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}` : ""}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={!pagination.hasPreviousPage}
                        className="h-8 w-8"
                    >
                        <IconLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={!pagination.hasNextPage}
                        className="h-8 w-8"
                    >
                        <IconRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
