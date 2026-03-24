"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isTicketStatusGroup, type TicketStatusGroup } from "@dosc-syspro/core";
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
    const handleStatusChange = (value: string) => {
        if (isTicketStatusGroup(value)) {
            setStatusFilter(value);
        }
    };

    return (
        <div className="flex flex-col gap-4 p-1">
            <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                <Tabs defaultValue="open" value={statusFilter} onValueChange={handleStatusChange} className="w-full lg:w-auto">
                    <TabsList className="grid h-11 w-full grid-cols-3 rounded-lg border border-border/40 bg-muted/40 p-1 lg:w-auto">
                        <TabsTrigger value="open" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Abertos ({counts.open})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Em analise ({counts.pending})
                        </TabsTrigger>
                        <TabsTrigger value="closed" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                            Fechados ({counts.closed})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="group relative w-full lg:w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                        placeholder={isAdmin ? "Buscar por assunto, ID ou cliente..." : "Buscar por assunto ou ID..."}
                        className="h-11 rounded-lg border-border/60 bg-background pl-10 transition-all focus:border-primary/50"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {statusFilter === "closed" && (
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Periodo dos fechados</span>
                    <Select value={closedWindow} onValueChange={(value) => setClosedWindow(value as ClosedTicketsWindow)}>
                        <SelectTrigger className="w-full max-w-60 bg-background">
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
