import Link from "next/link";
import { getMyTicketsAction } from "@/actions/app/ticket-actions";
import { TicketSheet } from "@/components/platform/client/TicketSheet";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Ticket,
    Search,
    Clock,
    ArrowRight,
    MessageCircle,
    Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default async function ChamadosPage() {
    const { success, data: tickets } = await getMyTicketsAction();
    const ticketList = success && tickets ? tickets : [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto">

            {/* Cabeçalho da Página */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                        Meus Chamados
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Acompanhe o status e histórico das suas solicitações.
                    </p>
                </div>
                <TicketSheet />
            </div>

            {/* Barra de Filtros (Visual por enquanto) */}
            <div className="flex items-center gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por assunto ou ID..."
                        className="pl-9 bg-background/60 border-border/50 focus:bg-background transition-colors"
                    />
                </div>
                <Button variant="outline" className="gap-2 hidden sm:flex">
                    <Filter className="h-4 w-4" /> Filtros
                </Button>
            </div>

            {/* Lista de Tickets */}
            <Card className="border-border/50 shadow-sm overflow-hidden bg-background/60 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-border/40 bg-muted/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                <Ticket className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base font-medium">Histórico de Atendimento</CardTitle>
                        </div>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border/50">
                            {ticketList.length} registros
                        </span>
                    </div>
                </CardHeader>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/5">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px] pl-6">ID</TableHead>
                                <TableHead className="min-w-[300px]">Assunto</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Prioridade</TableHead>
                                <TableHead className="text-right pr-6">Última Atualização</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ticketList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                                <MessageCircle className="h-6 w-6 opacity-30" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">Nenhum chamado encontrado</p>
                                                <p className="text-sm">Crie uma nova solicitação para começar.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                ticketList.map((ticket: any) => (
                                    <TableRow key={ticket.id} className="group hover:bg-muted/40 transition-colors cursor-pointer relative">
                                        <TableCell className="pl-6 font-mono font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                            <Link href={`/app/chamados/${ticket.id}`} className="absolute inset-0 z-10" />
                                            #{ticket.id}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                                                {ticket.subject}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={ticket.status} />
                                        </TableCell>
                                        <TableCell>
                                            <PriorityBadge priority={ticket.priority} />
                                        </TableCell>
                                        <TableCell className="text-right pr-6 text-muted-foreground text-sm flex items-center justify-end gap-2">
                                            <Clock className="h-3 w-3" />
                                            {ticket.lastUpdate}
                                            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary ml-2" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

/* --- Componentes Auxiliares de Badge (Reutilizados) --- */

function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || '';
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

    if (['novo', 'new', 'aberto', 'open'].includes(s)) {
        style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    }
    if (['resolvido', 'closed', 'fechado', 'merged'].includes(s)) {
        style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    }
    if (['pendente', 'pending', 'em análise'].includes(s)) {
        style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    }

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-2.5 py-0.5 shadow-sm`}>
            {status}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const p = priority?.toLowerCase() || '';

    if (p.includes('alta') || p.includes('high') || p.includes('3')) {
        return <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full w-fit border border-red-100 dark:border-red-900/50"><div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Alta</div>
    }
    if (p.includes('média') || p.includes('normal') || p.includes('2')) {
        return <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full w-fit border border-blue-100 dark:border-blue-900/50"><div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Normal</div>
    }
    return <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full w-fit border border-zinc-200 dark:border-zinc-700"><div className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Baixa</div>
}