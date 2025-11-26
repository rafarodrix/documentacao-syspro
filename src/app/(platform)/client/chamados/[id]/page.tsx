import { getTicketDetailsAction } from "../../_actions/ticket-actions";
import { TicketChat } from "@/components/platform/client/TicketChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Hash } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: {
        id: string;
    };
}

export default async function TicketDetailsPage({ params }: PageProps) {
    const { success, ticket, articles, error } = await getTicketDetailsAction(params.id);

    if (!success || !ticket) {
        // Em produção, trate o erro melhor ou redirecione
        return (
            <div className="p-8 text-center">
                <h1 className="text-xl font-bold text-red-500 mb-2">Erro ao carregar chamado</h1>
                <p className="text-muted-foreground">{error}</p>
                <Link href="/client" className="mt-4 inline-block underline">Voltar</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">

            {/* Header de Navegação */}
            <div className="flex items-center gap-4 mb-2">
                <Link href="/client">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        {ticket.title}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md border">
                            <Hash className="h-3 w-3" /> {ticket.number}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Criado em {ticket.createdAt}
                        </span>
                    </div>
                </div>
                <div className="ml-auto">
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
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200';

    if (['novo', 'new', 'aberto', 'open'].includes(s)) style = 'bg-blue-100 text-blue-700 border-blue-200';
    if (['resolvido', 'closed'].includes(s)) style = 'bg-green-100 text-green-700 border-green-200';
    if (['pendente'].includes(s)) style = 'bg-amber-100 text-amber-700 border-amber-200';

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-3 py-1`}>
            {status}
        </Badge>
    );
}