"use client";

import { Input } from "@/components/ui/input";
import { CalendarDays, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type TicketStatusGroup, type QueueKey } from "@dosc-syspro/core";
import type { ClosedTicketsWindow, TicketStatusCounts, TicketTeamFilter } from "./types";

interface TicketsFiltersProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    statusFilter: TicketStatusGroup;
    setStatusFilter: (val: TicketStatusGroup) => void;
    closedWindow: ClosedTicketsWindow;
    setClosedWindow: (val: ClosedTicketsWindow) => void;
    isAdmin: boolean;
    counts: TicketStatusCounts;
    team: TicketTeamFilter;
    setTeamFilter: (val: TicketTeamFilter) => void;
    queue: QueueKey;
    setQueueFilter: (val: QueueKey) => void;
    queueCounts: Record<QueueKey, number>;
}

const CLOSED_WINDOW_LABELS: Record<ClosedTicketsWindow, string> = {
    "30d": "Ultimos 30 dias",
    "60d": "Ultimos 60 dias",
    "90d": "Ultimos 90 dias",
    "180d": "Ultimos 6 meses",
    "365d": "Ultimo ano",
    all: "Todos",
};

export function TicketsFilters({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    closedWindow,
    setClosedWindow,
    isAdmin,
    counts,
    team,
    setTeamFilter,
    queue,
    setQueueFilter,
    queueCounts,
}: TicketsFiltersProps) {
    return (
        <div className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:w-auto">
                    <div className="flex min-w-max rounded-md bg-muted/40 p-1">
                        <Button type="button" variant={statusFilter === "open" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "open" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("open")}>
                            Abertos ({counts.open})
                        </Button>
                        <Button type="button" variant={statusFilter === "pending" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "pending" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("pending")}>
                            Em analise ({counts.pending})
                        </Button>
                        <Button type="button" variant={statusFilter === "closed" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "closed" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("closed")}>
                            Fechados ({counts.closed})
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 items-center gap-3 w-full xl:w-auto">
                    <div className="group relative flex-1 min-w-48">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            id="global-ticket-search"
                            placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                            className="h-10 rounded-md border-border/60 bg-background pl-10 text-sm transition-all focus:border-primary/50 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                            <Select value={team} onValueChange={(val) => setTeamFilter(val as TicketTeamFilter)}>
                                <SelectTrigger className="h-10 w-[140px] bg-background">
                                    <SelectValue placeholder="Equipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas equipes</SelectItem>
                                    <SelectItem value="SUPORTE">Suporte</SelectItem>
                                    <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={queue} onValueChange={(val) => setQueueFilter(val as QueueKey)}>
                                <SelectTrigger className="h-10 w-[160px] bg-background">
                                    <SelectValue placeholder="Fila" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos ({queueCounts.all})</SelectItem>
                                    <SelectItem value="my_queue">Meus tickets ({queueCounts.my_queue})</SelectItem>
                                    <SelectItem value="unassigned">Sem dono ({queueCounts.unassigned})</SelectItem>
                                    <SelectItem value="critical">Criticos ({queueCounts.critical})</SelectItem>
                                    <SelectItem value="no_response">Sem resposta ({queueCounts.no_response})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {statusFilter === "closed" && (
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3 px-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        <CalendarDays className="h-3.5 w-3.5" /> Periodo dos fechados
                    </span>
                    <Select value={closedWindow} onValueChange={(value) => setClosedWindow(value as ClosedTicketsWindow)}>
                        <SelectTrigger className="h-9 w-full bg-background sm:max-w-60">
                            <SelectValue placeholder="Selecione o periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(CLOSED_WINDOW_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
}
