"use client";

import { useState } from "react";
import { TicketSheet } from "@/components/platform/tickets/TicketSheet";
import { TicketsStats, TicketStatusGroup } from "./TicketsStats";
import { TicketsFilters } from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";
import { Button } from "@/components/ui/button";
import { ChevronLeft as IconLeft, ChevronRight as IconRight } from "lucide-react"

interface TicketsContainerProps {
    tickets: any[];
    isAdmin: boolean;
}

export function TicketsContainer({ tickets: initialTickets, isAdmin }: TicketsContainerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("open");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- LÓGICA DE CATEGORIZAÇÃO  ---
    const getCategory = (status: string): TicketStatusGroup => {
        // Normaliza para evitar problemas de Case
        const s = status.toLowerCase();

        // 1. ABERTOS (Fila de Entrada)
        // Status que indicam que ninguém mexeu ou que requer atenção imediata
        if (s.includes('new') || s.includes('novo')) return 'open';

        // 2. FECHADOS (Arquivo)
        // Status finais de ciclo de vida
        if (
            s.includes('closed') || s.includes('fechado') ||
            s.includes('merged') || s.includes('mesclado') ||
            s.includes('removed') || s.includes('removido') ||
            s.includes('rejected') || s.includes('recusado')
        ) {
            return 'closed';
        }

        // 3. PENDENTES / EM ANÁLISE (O "Meio de Campo")
        // Qualquer coisa que não é novo nem fechado (Open, Pending Reminder, Pending Action)
        // Isso captura "Em Análise", "Em Desenvolvimento", "Aguardando Cliente", etc.
        return 'pending';
    }

    // --- FILTRAGEM ---
    const filteredTickets = initialTickets.filter((ticket) => {
        // 1. Texto
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.number.toString().includes(searchTerm) ||
            (isAdmin && String(ticket.customer).toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Status
        const category = getCategory(ticket.status);
        const matchesStatus = statusFilter === category;

        return matchesSearch && matchesStatus;
    });

    // --- PAGINAÇÃO ---
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

            {/* Header */}
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

            {/* Stats */}
            <TicketsStats tickets={initialTickets} getCategory={getCategory} />

            {/* Filtros */}
            <TicketsFilters
                searchTerm={searchTerm}
                setSearchTerm={(v) => { setSearchTerm(v); setCurrentPage(1); }}
                statusFilter={statusFilter}
                setStatusFilter={(v) => { setStatusFilter(v); setCurrentPage(1); }}
                isAdmin={isAdmin}
            />

            {/* Tabela */}
            <TicketsTable tickets={paginatedTickets} isAdmin={isAdmin} />

            {/* Paginação Footer */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-2">
                    <span className="text-sm text-muted-foreground mr-2">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8"
                    >
                        <IconLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8"
                    >
                        <IconRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}