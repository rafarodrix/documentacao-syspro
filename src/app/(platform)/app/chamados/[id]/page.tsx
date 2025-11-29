import { getTicketDetailsAction } from "../../../../../actions/app/ticket-actions";
import { TicketChat } from "@/components/platform/client/TicketChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Hash, AlertCircle } from "lucide-react";
import Link from "next/link";

// Interface ajustada para Next.js 15 (params como Promise)
interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function TicketDetailsPage({ params }: PageProps) {
    // 1. Aguarda os parâmetros da rota
    const { id } = await params;

    // 2. Busca os dados no servidor
    const { success, ticket, articles, error } = await getTicketDetailsAction(id);

    // 3. Tratamento de Erro (UI amigável em caso de falha)
    if (!success || !ticket) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="h-16 w-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Não foi possível carregar o chamado</h1>
                <p className="text-muted-foreground max-w-md mb-6">
                    {error || "O ticket pode não existir ou você não tem permissão para visualizá-lo."}
                </p>
                <Link href="/client">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Voltar para Meus Chamados
                    </Button>
                </Link>
            </div>
        );
    }

    // 4. Renderização Principal
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto p-4 md:p-0">

            {/* Header de Navegação e Título */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2 border-b border-border/40 pb-6">
                <div className="flex items-start gap-4">
                    <Link href="/client">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted/80 -ml-2">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </Link>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground line-clamp-2">
                            {ticket.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-0.5 rounded-md border border-border/50 font-mono text-xs">
                                <Hash className="h-3 w-3" /> {ticket.number}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs">
                                <Clock className="h-3 w-3" /> Criado em {ticket.createdAt}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="md:ml-auto flex items-center gap-3">
                    {/* Aqui passamos o status, mas ele pode vir nulo, o componente abaixo agora trata isso */}
                    <StatusBadge status={ticket.status} />
                </div>
            </div>

            {/* Componente de Chat */}
            <TicketChat
                ticketId={String(ticket.id)} // Converte para string para garantir compatibilidade
                articles={articles || []}
                ticketStatus={ticket.status || ''} // Garante string vazia se nulo
            />

        </div>
    );
}

/* --- Componente Auxiliar de Badge de Status (Safe) --- */
function StatusBadge({ status }: { status?: string | null }) {
    const s = (status || '').toLowerCase();

    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

    // Mapeamento de cores conforme status do Zammad
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