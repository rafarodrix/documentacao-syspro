import { getTicketDetailsAction } from "../../_actions/ticket-actions";
import { TicketChat } from "@/components/platform/client/TicketChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Hash } from "lucide-react";
import Link from "next/link";

// CORREÇÃO: No Next.js 15, params é uma Promise
interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function TicketDetailsPage({ params }: PageProps) {
    // CORREÇÃO: Aguardamos a resolução dos params antes de usar
    const { id } = await params;

    const { success, ticket, articles, error } = await getTicketDetailsAction(id);

    if (!success || !ticket) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center h-[50vh]">
                <h1 className="text-xl font-bold text-red-500 mb-2">Erro ao carregar chamado</h1>
                <p className="text-muted-foreground">{error || "Chamado não encontrado."}</p>
                <Link href="/client">
                    <Button variant="outline" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto p-4 md:p-0">

            {/* Header de Navegação */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <Link href="/client">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/80">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 line-clamp-1">
                            {ticket.title}
                        </h1>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md border border-border/50 font-mono">
                                <Hash className="h-3 w-3" /> {ticket.number}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {ticket.createdAt}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="md:ml-auto">
                    <StatusBadge status={ticket.status} />
                </div>
            </div>

            {/* Componente de Chat */}
            <TicketChat
                ticketId={ticket.id}
                articles={articles || []}
                ticketStatus={ticket.status}
            />

        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || '';
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

    if (['novo', 'new', 'aberto', 'open'].includes(s)) {
        style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    }
    if (['resolvido', 'closed', 'fechado'].includes(s)) {
        style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    }
    if (['pendente', 'pending'].includes(s)) {
        style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    }

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-3 py-1`}>
            {status}
        </Badge>
    );
}