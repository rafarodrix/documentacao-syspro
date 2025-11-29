// src/components/platform/client/dashboard/RecentTicketsTable.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Ticket, ArrowUpRight } from "lucide-react"
import Link from "next/link"

// --- Componentes de Badge Internos ---
function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase() || '';
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200';

    if (['novo', 'new', 'aberto', 'open'].includes(s)) style = 'bg-blue-500/10 text-blue-600 border-blue-200';
    else if (['em análise', 'pending'].includes(s)) style = 'bg-amber-500/10 text-amber-600 border-amber-200';
    else if (['resolvido', 'closed'].includes(s)) style = 'bg-green-500/10 text-green-600 border-green-200';

    return <Badge variant="outline" className={`border ${style} font-normal capitalize`}>{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: string }) {
    const p = priority?.toLowerCase() || '';
    if (p.includes('alta') || p.includes('3')) return <span className="text-red-500 text-xs font-medium flex items-center gap-1">Alta</span>;
    if (p.includes('média') || p.includes('2')) return <span className="text-blue-500 text-xs font-medium flex items-center gap-1">Normal</span>;
    return <span className="text-zinc-500 text-xs font-medium flex items-center gap-1">Baixa</span>;
}

// --- Componente Principal ---
export function RecentTicketsTable({ tickets }: { tickets: any[] }) {
    const recentTickets = tickets.slice(0, 5)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" /> Seus Chamados Recentes
                </h2>
                {tickets.length > 5 && (
                    <Link href="/app/chamados" className="text-sm text-primary hover:underline flex items-center gap-1">
                        Ver todos <ArrowUpRight className="h-3 w-3" />
                    </Link>
                )}
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Assunto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead className="text-right">Atualização</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    Nenhum chamado recente.
                                </TableCell>
                            </TableRow>
                        ) : (
                            recentTickets.map((ticket) => (
                                <TableRow key={ticket.id} className="hover:bg-muted/30">
                                    <TableCell className="font-mono text-xs">#{ticket.id}</TableCell>
                                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                                    <TableCell><StatusBadge status={ticket.status} /></TableCell>
                                    <TableCell><PriorityBadge priority={ticket.priority} /></TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">{ticket.lastUpdate}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}