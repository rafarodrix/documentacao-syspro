"use client"

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, Building2, CheckCircle2, SearchX } from "lucide-react"
import Link from "next/link"

interface TicketsTableProps {
    tickets: any[]
    isAdmin: boolean
}

export function TicketsTable({ tickets, isAdmin }: TicketsTableProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden animate-in fade-in duration-700">
            <Table>
                <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent border-b border-border/60">
                        <TableHead className="w-[100px]">Ticket</TableHead>
                        <TableHead className="min-w-[300px]">Assunto</TableHead>
                        {isAdmin && <TableHead>Cliente</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Atualização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tickets.length === 0 ? (
                        <EmptyState />
                    ) : (
                        tickets.map((ticket) => (
                            <TableRow key={ticket.id} className="group hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0">
                                <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                    #{ticket.number}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-foreground truncate max-w-[300px] sm:max-w-[400px]">
                                            {ticket.title}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                                            {ticket.group}
                                        </span>
                                    </div>
                                </TableCell>

                                {isAdmin && (
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Building2 className="w-3 h-3" />
                                            <span className="text-sm truncate max-w-[150px]">{ticket.customer}</span>
                                        </div>
                                    </TableCell>
                                )}

                                <TableCell>
                                    <StatusBadge status={ticket.statusLabel} rawStatus={ticket.status} />
                                </TableCell>
                                <TableCell>
                                    <PriorityBadge priority={ticket.priority} />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                    {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary h-8 px-3 rounded-full">
                                        <Link href={isAdmin ? `/admin/chamados/${ticket.id}` : `/app/chamados/${ticket.id}`}>
                                            <span className="hidden sm:inline mr-1 text-xs font-medium">Abrir</span>
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

// --- HELPERS VISUAIS ---

// Configuração de Cores e Keywords
// A ordem importa: o sistema vai pegar o primeiro que der "match"
const STATUS_CONFIG = [
    {
        // Status: 1. Novo
        keywords: ['1. novo', 'new'],
        color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
    },
    {
        // Status: 2 e 3 (Fase de Trabalho)
        keywords: ['2. em analise', '3. em desenvolvimento', 'pending', 'pendente'],
        color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
    },
    {
        // Status: 4 e 5 (Fase de Validação)
        keywords: ['4. em testes', '5. aguardando', 'validação'],
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400'
    },
    {
        // Status: 7 (Sucesso)
        keywords: ['7. finalizado', 'resolvido', 'fechado', 'closed', 'merged', 'aberto', 'open'],
        // Nota: 'aberto' e 'open' geralmente são verdes em sistemas de ticket, mas ajuste se preferir outra cor
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
    },
    {
        // Status: 8 e 9 (Falha/Recusa)
        keywords: ['8. não foi', '9. recusado', 'rejected', 'removed'],
        color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
    }
];

function StatusBadge({ status, rawStatus }: { status: string, rawStatus: string }) {
    // 1. Normalização
    const term = (rawStatus || status || '').toLowerCase();

    // 2. Busca Inteligente (Strategy Pattern)
    const matchedConfig = STATUS_CONFIG.find(config =>
        config.keywords.some(keyword => term.includes(keyword))
    );

    // 3. Definição do Estilo
    const style = matchedConfig ? matchedConfig.color : DEFAULT_STYLE;

    // 4. Limpeza do Label (Remove "1. ", "2. " etc)
    const label = status.replace(/^\d+\.\s*/, '');

    return (
        <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap`}>
            {label}
        </Badge>
    );
}

// Estilo Padrão (Fallback)
const DEFAULT_STYLE = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400';

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2 rounded-full">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2 rounded-full bg-muted text-muted-foreground">Baixa</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground rounded-full">Normal</Badge>;
}

function EmptyState() {
    return (
        <TableRow>
            <TableCell colSpan={7} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <SearchX className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <div>
                        <p className="text-base font-medium text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-sm mt-1 opacity-70">
                            Tente ajustar os filtros ou busque por outro termo.
                        </p>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}