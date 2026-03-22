"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isTicketStatusGroup, type TicketStatusGroup } from "@/core/config/tickets-workflow";
import type { TicketStatusCounts } from "./types";

interface TicketsFiltersProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    statusFilter: TicketStatusGroup | "all";
    setStatusFilter: (val: TicketStatusGroup | "all") => void;
    isAdmin: boolean;
    counts: TicketStatusCounts;
}

export function TicketsFilters({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    isAdmin,
    counts,
}: TicketsFiltersProps) {
    const handleStatusChange = (value: string) => {
        if (value === "all") {
            setStatusFilter("all");
            return;
        }

        if (isTicketStatusGroup(value)) {
            setStatusFilter(value);
        }
    };

    return (
        <div className="flex flex-col items-center justify-between gap-4 p-1 lg:flex-row">
            <Tabs defaultValue="all" value={statusFilter} onValueChange={handleStatusChange} className="w-full lg:w-auto">
                <TabsList className="grid h-11 w-full grid-cols-4 rounded-lg border border-border/40 bg-muted/40 p-1 lg:w-auto">
                    <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        Todos
                    </TabsTrigger>
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
    );
}
