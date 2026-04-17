"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type TicketStatusGroup } from "@dosc-syspro/core";
import type { ClosedTicketsWindow, TicketStatusCounts } from "./types";

interface TicketsFiltersProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    statusFilter: TicketStatusGroup;
    setStatusFilter: (val: TicketStatusGroup) => void;
    closedWindow: ClosedTicketsWindow;
    setClosedWindow: (val: ClosedTicketsWindow) => void;
    isAdmin: boolean;
    counts: TicketStatusCounts;
}

const CLOSED_WINDOW_LABELS: Record<ClosedTicketsWindow, string> = {
    "30d": "Ultimos 30 dias",
    "60d": "Ultimos 60 dias",
    "90d": "Ultimos 90 dias",
    "180d": "Ultimos 6 meses",
    "365d": "Ultimo ano",
    "all": "Todos",
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
}: TicketsFiltersProps) {
    return (
        <div className="flex flex-col gap-4 p-1">
            <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                <div className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto">
                    <div className="flex min-w-max gap-2">
                    <Button type="button" variant={statusFilter === "open" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("open")}>
                        Abertos ({counts.open})
                    </Button>
                    <Button type="button" variant={statusFilter === "pending" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("pending")}>
                        Em analise ({counts.pending})
                    </Button>
                    <Button type="button" variant={statusFilter === "closed" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("closed")}>
                        Fechados ({counts.closed})
                    </Button>
                    </div>
                </div>

                <div className="group relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        id="global-ticket-search"
                        placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                        className="h-11 rounded-lg border-border/60 bg-background pl-10 transition-all focus:border-primary/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {statusFilter === "closed" && (
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Periodo dos fechados</span>
                    <Select value={closedWindow} onValueChange={(value) => setClosedWindow(value as ClosedTicketsWindow)}>
                        <SelectTrigger className="w-full bg-background sm:max-w-60">
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
