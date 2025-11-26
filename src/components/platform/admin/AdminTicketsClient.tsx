"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Ticket,
    Search,
    Filter,
    AlertCircle,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    Inbox,
    RotateCcw
} from "lucide-react";
import Link from "next/link";

// Tipagem do Ticket formatado
interface Ticket {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    priority: number;
    customer: number;
    createdAt: string;
    updatedAt: string;
}

interface AdminTicketsClientProps {
    initialTickets: Ticket[];
}

export function AdminTicketsClient({ initialTickets }: AdminTicketsClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'open', 'pending', 'closed'

    // Normaliza e traduz status para facilitar o filtro
    const normalizeStatus = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (['novo', 'new', 'aberto', 'open'].some(v => s.includes(v))) return 'open';
        if (['pendente', 'pending', 'análise'].some(v => s.includes(v))) return 'pending';
        if (['resolvido', 'closed', 'fechado', 'merged'].some(v => s.includes(v))) return 'closed';
        return 'other';
    };

    // Lógica de Filtragem
    const filteredTickets = initialTickets.filter((ticket) => {
        // 1. Filtro de Texto (ID ou Título)
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.number.toString().includes(searchTerm);

        // 2. Filtro de Status (Abas)
        const ticketStatusCategory = normalizeStatus(ticket.status);
        const matchesStatus =
            statusFilter === "all"
                ? ticketStatusCategory !== 'closed' // Por padrão 'all' esconde fechados para focar no trabalho
                : statusFilter === "history" // Aba específica para fechados
                    ? ticketStatusCategory === 'closed'
                    : ticketStatusCategory === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Contadores para os Cards de KPI (baseados no total inicial, não no filtro de busca)
    const totalOpen = initialTickets.filter(t => normalizeStatus(t.status) === 'open').length;
    const totalPending = initialTickets.filter(t => normalizeStatus(t.status) === 'pending').length;
    const highPriority = initialTickets.filter(t => t.priority === 3 && normalizeStatus(t.status) !== 'closed').length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Cabeçalho */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                    Central de Atendimento
                </h1>
                <p className="text-muted-foreground text-lg">
                    Gerencie a fila de solicitações e suporte técnico.
                </p>
            </div>

            {/* Cards de Resumo Rápido (KPIs) */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400">Novos & Abertos</CardTitle>
                        <Inbox className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOpen}</div>
                        <p className="text-xs text-muted-foreground">Fila principal</p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">Em Análise</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalPending}</div>
                        <p className="text-xs text-muted-foreground">Aguardando resposta</p>
                    </CardContent>
                </Card>

                <Card className="bg-red-500/5 border-red-500/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Prioridade Alta</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{highPriority}</div>
                        <p className="text-xs text-muted-foreground">Atenção imediata</p>
                    </CardContent>
                </Card>
            </div>

            {/* Área de Listagem com Filtros */}
            <div className="space-y-4">

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    {/* Abas de Status */}
                    <Tabs defaultValue="all" value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
                        <TabsList className="grid w-full lg:w-auto grid-cols-4 h-10">
                            <TabsTrigger value="all">Fila Ativa</TabsTrigger>
                            <TabsTrigger value="open" className="hidden sm:inline-flex">Abertos</TabsTrigger>
                            <TabsTrigger value="pending" className="hidden sm:inline-flex">Pendentes</TabsTrigger>
                            <TabsTrigger value="history">Histórico</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Barra de Busca */}
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por assunto, ID ou cliente..."
                            className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Tabela */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px]">Ticket</TableHead>
                                <TableHead className="min-w-[300px]">Assunto</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Prioridade</TableHead>
                                <TableHead>Abertura</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                                            {statusFilter === 'history' ? (
                                                <RotateCcw className="h-8 w-8 opacity-30" />
                                            ) : (
                                                <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                                            )}
                                            <p>Nenhum chamado encontrado neste filtro.</p>
                                            {statusFilter !== 'history' && <p className="text-xs">Ótimo trabalho! A fila está limpa.</p>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <TableRow key={ticket.id} className="group hover:bg-muted/40 transition-colors">
                                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                                            #{ticket.number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground truncate max-w-[400px]">{ticket.title}</span>
                                                <span className="text-xs text-muted-foreground">Grupo: {ticket.group}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={ticket.status} />
                                        </TableCell>
                                        <TableCell>
                                            <PriorityBadge priority={ticket.priority} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {ticket.createdAt}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary">
                                                <Link href={`/admin/chamados/${ticket.id}`}>
                                                    Atender <ArrowUpRight className="ml-2 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

/* --- Badges Visuais --- */

function StatusBadge({ status }: { status: string }) {
    const s = (status || '').toLowerCase();
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

    if (['novo', 'new'].some(v => s.includes(v))) style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
    if (['aberto', 'open'].some(v => s.includes(v))) style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    if (['pendente', 'pending', 'análise'].some(v => s.includes(v))) style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
    if (['fechado', 'closed', 'resolvido'].some(v => s.includes(v))) style = 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700';

    return (
        <Badge variant="outline" className={`border ${style} font-medium capitalize px-2.5 py-0.5 shadow-sm`}>
            {status}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) { // High
        return <Badge variant="destructive" className="text-[10px] font-bold px-2 shadow-sm">Alta</Badge>;
    }
    if (priority === 1) { // Low
        return <Badge variant="secondary" className="text-[10px] text-muted-foreground px-2 bg-muted/50 border-border/50">Baixa</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] text-muted-foreground px-2 border-border/50">Normal</Badge>;
}