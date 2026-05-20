"use client";

import { useState } from "react";
import { Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@dosc-syspro/ui";
import { CalendarDays, Filter, Search, X } from "lucide-react";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { formatModuleOptionLabel } from "@/features/tickets/interface/lib/ticket-module-hierarchy";
import { type TicketStatusGroup, type QueueKey } from "@dosc-syspro/core";
import type { ClosedTicketsWindow, TicketStatusCounts, TicketTeamFilter } from "./ticket-view.types";

interface TicketsFiltersProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    statusFilter: TicketStatusGroup;
    setStatusFilter: (val: TicketStatusGroup) => void;
    closedWindow: ClosedTicketsWindow;
    setClosedWindow: (val: ClosedTicketsWindow) => void;
    canManageTickets: boolean;
    counts: TicketStatusCounts;
    team: TicketTeamFilter;
    setTeamFilter: (val: TicketTeamFilter) => void;
    queue: QueueKey;
    setQueueFilter: (val: QueueKey) => void;
    queueCounts: Record<QueueKey, number>;
    category: string;
    setCategoryFilter: (val: string) => void;
    module: string;
    setModuleFilter: (val: string) => void;
}

const CLOSED_WINDOW_LABELS: Record<ClosedTicketsWindow, string> = {
    all: "Todos",
    "30d": "Ultimos 30 dias",
    "60d": "Ultimos 60 dias",
    "90d": "Ultimos 90 dias",
    "180d": "Ultimos 6 meses",
    "365d": "Ultimo ano",
};

export function TicketsFilters({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    closedWindow,
    setClosedWindow,
    canManageTickets,
    counts,
    team,
    setTeamFilter,
    queue,
    setQueueFilter,
    queueCounts,
    category,
    setCategoryFilter,
    module,
    setModuleFilter,
}: TicketsFiltersProps) {
    const [showFilters, setShowFilters] = useState(false);
    const ticketSettings = useTicketModuleSettings();
    const categoryOptions = ticketSettings.categories.filter((item) => team === "all" || item.defaultTeam === team);
    const hasAdvancedFilters =
        team !== "all" ||
        queue !== "all" ||
        Boolean(category.trim()) ||
        Boolean(module.trim()) ||
        (statusFilter === "closed" && closedWindow !== "all");

    const activeFilterCount = [
        team !== "all",
        queue !== "all",
        Boolean(category.trim()) && category !== "all",
        Boolean(module.trim()) && module !== "all",
        statusFilter === "closed" && closedWindow !== "all",
    ].filter(Boolean).length;

    return (
        <div className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:w-auto">
                    <div className="flex min-w-max rounded-md bg-muted/40 p-1">
                        <Button type="button" variant={statusFilter === "open" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "open" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("open")}>
                            Abertos ({counts.open})
                        </Button>
                        <Button type="button" variant={statusFilter === "development" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "development" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("development")}>
                            Em desenvolvimento ({counts.development})
                        </Button>
                        <Button type="button" variant={statusFilter === "testing" ? "secondary" : "ghost"} size="sm" className={`h-8 px-4 ${statusFilter === "testing" ? "bg-background shadow-sm" : ""}`} onClick={() => setStatusFilter("testing")}>
                            Em testes ({counts.testing})
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
                            placeholder={canManageTickets ? "Buscar por assunto, ID, empresa ou contato..." : "Buscar por assunto ou ID..."}
                            className="h-10 rounded-md border-border/60 bg-background pl-10 text-sm transition-all focus:border-primary/50 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canManageTickets && (
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative shrink-0">
                            <Button
                                type="button"
                                variant={showFilters ? "secondary" : "outline"}
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setShowFilters((current) => !current)}
                                aria-label={`Filtros avancados${activeFilterCount > 0 ? ` (${activeFilterCount} ativos)` : ""}`}
                            >
                                <Filter className="h-4 w-4" />
                            </Button>
                            {activeFilterCount > 0 && (
                                <span className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                                    {activeFilterCount}
                                </span>
                            )}
                        </div>
                            {hasAdvancedFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-3 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setTeamFilter("all");
                                        setQueueFilter("all");
                                        setCategoryFilter("all");
                                        setModuleFilter("all");
                                        if (statusFilter === "closed") setClosedWindow("all");
                                    }}
                                >
                                    <X className="mr-2 h-3.5 w-3.5" />
                                    Limpar
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {canManageTickets && showFilters && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-lg border border-border/40 bg-background p-3.5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Equipe</Label>
                            <Select value={team} onValueChange={(val) => setTeamFilter(val as TicketTeamFilter)}>
                                <SelectTrigger className="h-9 bg-background">
                                    <SelectValue placeholder="Equipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas equipes</SelectItem>
                                    <SelectItem value="SUPORTE">Suporte</SelectItem>
                                    <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {statusFilter !== "closed" ? (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fila</Label>
                                <Select value={queue} onValueChange={(val) => setQueueFilter(val as QueueKey)}>
                                    <SelectTrigger className="h-9 bg-background">
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
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Periodo</Label>
                                <Select value={closedWindow} onValueChange={(value) => setClosedWindow(value as ClosedTicketsWindow)}>
                                    <SelectTrigger className="h-9 bg-background">
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

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</Label>
                            <Select value={category || "all"} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="h-9 bg-background">
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas categorias</SelectItem>
                                    {categoryOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Modulo</Label>
                            <Select value={module || "all"} onValueChange={setModuleFilter}>
                                <SelectTrigger className="h-9 bg-background">
                                    <SelectValue placeholder="Modulo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos modulos</SelectItem>
                                    {ticketSettings.modules.map((option) => (
                                        <SelectItem key={option.id} value={option.value}>
                                            {formatModuleOptionLabel(option)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {!canManageTickets && statusFilter === "closed" && (
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
