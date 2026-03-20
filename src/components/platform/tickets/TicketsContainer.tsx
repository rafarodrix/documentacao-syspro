"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft as IconLeft, ChevronRight as IconRight } from "lucide-react";
import { TicketSheet } from "@/components/platform/tickets/TicketSheet";
import { TicketsStats, TicketStatusGroup } from "./TicketsStats";
import { TicketsFilters } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TicketListItem } from "./types";

interface TicketsContainerProps {
    tickets: TicketListItem[];
    isAdmin: boolean;
    pagination: {
        page: number;
        pageSize: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
        total: number | null;
    };
    staleWarning?: string;
    queue: "all" | "my_queue" | "unassigned" | "critical" | "no_response";
}

export function TicketsContainer({ tickets: initialTickets, isAdmin, pagination, staleWarning, queue }: TicketsContainerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("open");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const getCategory = (status: string): TicketStatusGroup => {
        const s = status.toLowerCase();
        if (s.includes("1. novo") || s.includes("1.novo")) return "open";
        if (
            s.includes("7. finalizado") ||
            s.includes("8. não foi possível reproduzir") ||
            s.includes("9. recusado") ||
            s.includes("fechado") ||
            s.includes("merged")
        ) {
            return "closed";
        }
        return "pending";
    };

    const filteredTickets = initialTickets.filter((ticket) => {
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.number.toString().includes(searchTerm) ||
            (isAdmin && String(ticket.customer).toLowerCase().includes(searchTerm.toLowerCase()));

        const category = getCategory(ticket.status);
        const matchesStatus = statusFilter === category;
        return matchesSearch && matchesStatus;
    });

    const goToPage = (nextPage: number) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("page", String(Math.max(1, nextPage)));
        router.push(`${pathname}?${params.toString()}`);
    };

    const setQueueFilter = (nextQueue: TicketsContainerProps["queue"]) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("queue", nextQueue);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {staleWarning && (
                <Alert className="border-amber-500/40 bg-amber-500/10">
                    <AlertTitle>Dados em modo contingência</AlertTitle>
                    <AlertDescription>{staleWarning}</AlertDescription>
                </Alert>
            )}

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {isAdmin ? "Central de Atendimento" : "Meus Chamados"}
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                        {isAdmin
                            ? "Gerencie a fila de suporte e solicitações."
                            : "Acompanhe o status das suas solicitações."}
                    </p>
                </div>
                {!isAdmin && <TicketSheet />}
            </div>

            <TicketsStats tickets={initialTickets} getCategory={getCategory} />

            {isAdmin && (
                <div className="flex flex-wrap gap-2">
                    <Button variant={queue === "all" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("all")}>
                        Todos
                    </Button>
                    <Button variant={queue === "my_queue" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("my_queue")}>
                        Minha fila
                    </Button>
                    <Button variant={queue === "unassigned" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("unassigned")}>
                        Sem dono
                    </Button>
                    <Button variant={queue === "critical" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("critical")}>
                        Críticos
                    </Button>
                    <Button variant={queue === "no_response" ? "default" : "outline"} size="sm" onClick={() => setQueueFilter("no_response")}>
                        Sem resposta
                    </Button>
                </div>
            )}

            <TicketsFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                isAdmin={isAdmin}
            />

            <TicketsTable tickets={filteredTickets} isAdmin={isAdmin} />

            {(pagination.hasPreviousPage || pagination.hasNextPage) && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        Página {pagination.page}
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
