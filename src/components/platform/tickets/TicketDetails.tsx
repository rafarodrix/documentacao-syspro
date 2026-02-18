"use client";

import { TicketChat } from "@/components/platform/tickets/TicketChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Hash, AlertCircle } from "lucide-react";
import Link from "next/link";

interface TicketDetailsProps {
    ticket: any;
    articles: any[];
    isAdmin: boolean;
    error?: string;
}

export function TicketDetails({ ticket, articles, isAdmin, error }: TicketDetailsProps) {

    const backUrl = isAdmin ? "/admin/chamados" : "/app/chamados";

    if (error || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Não foi possível carregar o chamado</h1>
                <p className="text-muted-foreground max-w-md mb-6">
                    {error || "O ticket pode não existir ou você não tem permissão."}
                </p>
                <Button variant="outline" asChild className="gap-2">
                    <Link href={backUrl}>
                        <ArrowLeft className="h-4 w-4" /> Voltar para Lista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto p-4 md:p-0">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2 border-b border-border/40 pb-6">

                <div className="flex items-start gap-3 flex-1 min-w-0"> {/* min-w-0 garante truncate funcionar */}

                    {/* Botão Voltar */}
                    <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-full hover:bg-muted/80 shrink-0 mt-1">
                        <Link href={backUrl}>
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                    </Button>

                    <div className="flex flex-col gap-1.5 min-w-0">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground break-words leading-snug">
                            {ticket.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="gap-1 font-mono text-xs font-normal bg-muted/50 border-border/50">
                                <Hash className="h-3 w-3" /> {ticket.number}
                            </Badge>

                            <span className="text-xs flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Criado em {ticket.createdAt}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={ticket.status} />
                </div>
            </div>

            {/* --- CHAT --- */}
            <TicketChat
                ticketId={String(ticket.id)}
                articles={articles || []}
                ticketStatus={ticket.status || ''}
            />
        </div>
    );
}

function StatusBadge({ status }: { status?: string | null }) {
    const s = (status || '').toLowerCase();
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

    if (['novo', 'new', 'aberto', 'open'].some(v => s.includes(v))) {
        style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    }
    if (['resolvido', 'closed', 'fechado'].some(v => s.includes(v))) {
        style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    }
    if (['pendente', 'pending', 'análise'].some(v => s.includes(v))) {
        style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    }

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-3 py-1 text-sm`}>
            {status || 'Desconhecido'}
        </Badge>
    );
}