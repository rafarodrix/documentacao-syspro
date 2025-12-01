"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    Inbox,
    Clock,
    AlertCircle,
    ArrowUpRight,
    CheckCircle2,
    Building2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { TicketSheet } from "@/components/platform/tickets/TicketSheet";

interface TicketData {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    statusLabel: string;
    priority: number;
    customer: string;
    createdAt: string;
    updatedAt: string;
}

interface TicketsContainerProps {
    tickets: TicketData[];
    isAdmin: boolean;
}

export function TicketsContainer({ tickets: initialTickets, isAdmin }: TicketsContainerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'open', 'pending', 'closed'

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // --- LÓGICA DE FILTRO ---

    // Função para categorizar status (para o filtro funcionar melhor)
    const getCategory = (status: string) => {
        const s = status.toLowerCase();
        if (['novo', 'new', 'aberto', 'open'].some(v => s.includes(v))) return 'open';
        if (['pendente', 'pending', 'análise'].some(v => s.includes(v))) return 'pending';
        if (['resolvido', 'closed', 'fechado', 'merged'].some(v => s.includes(v))) return 'closed';
        return 'other';
    }

    const filteredTickets = initialTickets.filter((ticket) => {
        // 1. Filtro de Texto
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.number.toString().includes(searchTerm) ||
            (isAdmin && String(ticket.customer).toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Filtro de Status
        const category = getCategory(ticket.status);
        const matchesStatus = statusFilter === "all"
            ? true
            : statusFilter === category;

        return matchesSearch && matchesStatus;
    });

    // --- LÓGICA DE PAGINAÇÃO ---
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);

    // KPIs (Calculados sobre o total recebido, não filtrado)
    const kpiOpen = initialTickets.filter((t) => getCategory(t.status) === "open").length;
    const kpiPending = initialTickets.filter((t) => getCategory(t.status) === "pending").length;
    const kpiHigh = initialTickets.filter((t) => t.priority === 3 && getCategory(t.status) !== "closed").length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Cabeçalho e KPIs */}
            <div className="flex flex-col gap-6">
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

                <div className="grid gap-4 md:grid-cols-3">
                    <KpiCard title="Abertos" value={kpiOpen} icon={Inbox} color="blue" label="Fila de atendimento" />
                    <KpiCard title="Em Análise" value={kpiPending} icon={Clock} color="amber" label="Aguardando resposta" />
                    <KpiCard title="Prioridade Alta" value={kpiHigh} icon={AlertCircle} color="red" label="Atenção necessária" />
                </div>
            </div>

            {/* Filtros e Tabela */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">

                    {/* Barra de Busca */}
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                            className="pl-9 bg-background"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    {/* Filtro de Status */}
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full lg:w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="open">Abertos / Novos</SelectItem>
                                <SelectItem value="pending">Pendentes</SelectItem>
                                <SelectItem value="closed">Resolvidos / Fechados</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabela */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
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
                            {paginatedTickets.length === 0 ? (
                                <EmptyState searchTerm={searchTerm} />
                            ) : (
                                paginatedTickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="group hover:bg-muted/40 transition-colors">
                                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                            #{ticket.number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground truncate max-w-[300px] sm:max-w-[400px]">
                                                    {ticket.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">Grupo: {ticket.group}</span>
                                            </div>
                                        </TableCell>

                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-muted-foreground" />
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
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary h-8 px-2">
                                                <Link href={isAdmin ? `/admin/chamados/${ticket.id}` : `/app/chamados/${ticket.id}`}>
                                                    <span className="hidden sm:inline mr-2">Detalhes</span>
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 py-2">
                        <span className="text-sm text-muted-foreground mr-2">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTES ---

function KpiCard({ title, value, icon: Icon, color, label }: any) {
    const colors: any = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        red: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const iconColors: any = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        red: "text-red-500"
    };

    return (
        <Card className={`${colors[color]} shadow-sm border`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconColors[color]}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs opacity-80">{label}</p>
            </CardContent>
        </Card>
    )
}

function StatusBadge({ status, rawStatus }: { status: string, rawStatus: string }) {
    const s = (rawStatus || '').toLowerCase();
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400';

    if (['novo', 'new', 'aberto', 'open'].some(v => s.includes(v))) { style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'; }
    if (['pendente', 'pending'].some(v => s.includes(v))) { style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'; }
    if (['fechado', 'closed', 'resolvido', 'merged'].some(v => s.includes(v))) { style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'; }

    return (
        <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5`}>
            {status}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2">Baixa</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground">Normal</Badge>;
}

function EmptyState({ searchTerm }: { searchTerm: string }) {
    return (
        <TableRow>
            <TableCell colSpan={7} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="text-base font-medium text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-sm mt-1">
                            {searchTerm ? "Tente buscar por outro termo." : "Não há tickets com o status selecionado."}
                        </p>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}