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
    Search,
    Inbox,
    Clock,
    AlertCircle,
    RotateCcw,
    ArrowUpRight,
    CheckCircle2,
    Building2
} from "lucide-react";
import Link from "next/link";
import { TicketSheet } from "@/components/platform/client/TicketSheet"; // Importe seu modal de criar

// Interface genérica para o Ticket
interface TicketData {
    id: number;
    number: string;
    title: string;
    group: string;
    status: string;
    priority: number;
    customer: string; // Nome do cliente (se admin)
    customerId?: number;
    createdAt: string;
    updatedAt: string;
}

interface TicketsContainerProps {
    tickets: TicketData[];
    isAdmin: boolean;
}

export function TicketsContainer({ tickets: initialTickets, isAdmin }: TicketsContainerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("active"); // 'active', 'history'

    // Função auxiliar para normalizar status
    const getStatusType = (status: string) => {
        const s = status?.toLowerCase() || "";
        if (["resolvido", "closed", "fechado", "merged"].some((v) => s.includes(v))) return "closed";
        if (["novo", "new", "aberto", "open"].some((v) => s.includes(v))) return "open";
        return "pending";
    };

    // Filtro Principal
    const filteredTickets = initialTickets.filter((ticket) => {
        // 1. Texto
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.number.toString().includes(searchTerm) ||
            (isAdmin && ticket.customer.toLowerCase().includes(searchTerm.toLowerCase()));

        // 2. Status (Aba Ativa vs Histórico)
        const isClosed = getStatusType(ticket.status) === "closed";
        const matchesStatus = statusFilter === "active" ? !isClosed : isClosed;

        return matchesSearch && matchesStatus;
    });

    // KPIs (baseado no total)
    const kpiOpen = initialTickets.filter((t) => getStatusType(t.status) === "open").length;
    const kpiPending = initialTickets.filter((t) => getStatusType(t.status) === "pending").length;
    const kpiHigh = initialTickets.filter((t) => t.priority === 3 && getStatusType(t.status) !== "closed").length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Cabeçalho e KPIs */}
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                            {isAdmin ? "Central de Atendimento" : "Meus Chamados"}
                        </h1>
                        <p className="text-muted-foreground text-lg mt-1">
                            {isAdmin
                                ? "Gerencie a fila de suporte de todos os clientes."
                                : "Acompanhe suas solicitações e abra novos tickets."}
                        </p>
                    </div>

                    {/* Apenas Cliente pode abrir chamado por aqui (Admin abre pelo Zammad geralmente) */}
                    {!isAdmin && <TicketSheet />}
                </div>

                {/* Cards de KPI */}
                <div className="grid gap-4 md:grid-cols-3">
                    <KpiCard title="Novos & Abertos" value={kpiOpen} icon={Inbox} color="blue" label="Fila de atendimento" />
                    <KpiCard title="Em Análise" value={kpiPending} icon={Clock} color="amber" label="Aguardando resposta" />
                    <KpiCard title="Prioridade Alta" value={kpiHigh} icon={AlertCircle} color="red" label="Atenção necessária" />
                </div>
            </div>

            {/* Área de Listagem */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <Tabs defaultValue="active" value={statusFilter} onValueChange={setStatusFilter} className="w-full lg:w-auto">
                        <TabsList className="grid w-full lg:w-auto grid-cols-2 h-10">
                            <TabsTrigger value="active">Fila Ativa</TabsTrigger>
                            <TabsTrigger value="history">Histórico (Fechados)</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative w-full max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                            className="pl-9 bg-background border-border/50 focus:border-primary/50 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

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
                            {filteredTickets.length === 0 ? (
                                <EmptyState filter={statusFilter} />
                            ) : (
                                filteredTickets.map((ticket) => (
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

                                        {/* Coluna Cliente (Só Admin) */}
                                        {isAdmin && (
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm">{ticket.customer}</span>
                                                </div>
                                            </TableCell>
                                        )}

                                        <TableCell>
                                            <StatusBadge status={ticket.status} />
                                        </TableCell>
                                        <TableCell>
                                            <PriorityBadge priority={ticket.priority} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(ticket.updatedAt).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild className="hover:bg-primary/10 hover:text-primary h-8 w-8 p-0 sm:w-auto sm:px-3">
                                                <Link href={isAdmin ? `/admin/chamados/${ticket.id}` : `/app/chamados/${ticket.id}`}>
                                                    <span className="hidden sm:inline">Ver Detalhes</span>
                                                    <ArrowUpRight className="sm:ml-2 h-4 w-4" />
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

function StatusBadge({ status }: { status: string }) {
    const s = (status || '').toLowerCase();
    let style = 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400';
    let label = status;

    if (['novo', 'new'].some(v => s.includes(v))) { style = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'; label = "Novo"; }
    if (['aberto', 'open'].some(v => s.includes(v))) { style = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400'; label = "Aberto"; }
    if (['pendente', 'pending'].some(v => s.includes(v))) { style = 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'; label = "Pendente"; }
    if (['fechado', 'closed'].some(v => s.includes(v))) { style = 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500'; label = "Fechado"; }

    return (
        <Badge variant="outline" className={`border ${style} font-medium px-2.5 py-0.5`}>
            {label}
        </Badge>
    );
}

function PriorityBadge({ priority }: { priority: number }) {
    if (priority === 3) return <Badge variant="destructive" className="text-[10px] px-2">Alta</Badge>;
    if (priority === 1) return <Badge variant="secondary" className="text-[10px] px-2">Baixa</Badge>;
    return <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground">Normal</Badge>;
}

function EmptyState({ filter }: { filter: string }) {
    return (
        <TableRow>
            <TableCell colSpan={7} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                        {filter === 'history' ? <RotateCcw className="h-6 w-6 opacity-40" /> : <CheckCircle2 className="h-6 w-6 text-green-500/40" />}
                    </div>
                    <div>
                        <p className="text-base font-medium text-foreground">Nenhum chamado encontrado</p>
                        <p className="text-sm mt-1">
                            {filter === 'history' ? "O histórico de chamados está vazio." : "Ótimo trabalho! A fila de atendimento está limpa."}
                        </p>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}