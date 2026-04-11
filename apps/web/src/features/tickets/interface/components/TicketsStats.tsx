"use client";

import type { ElementType } from "react";
import { Inbox, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberTicker } from "@/components/magicui/NumberTicker";
import { cn } from "@/lib/utils";
import type { TicketStatusCounts } from "./types";
import type { TicketStatusGroup } from "@dosc-syspro/core";

interface TicketsStatsProps {
    counts: TicketStatusCounts;
    activeStatus: TicketStatusGroup;
    onSelectStatus: (status: TicketStatusGroup) => void;
}

interface StatCardProps {
    title: string;
    value: number;
    icon: ElementType;
    description: string;
    colorClass: string;
    bgClass: string;
    active: boolean;
    onClick: () => void;
}

function StatCard({
    title,
    value,
    icon: Icon,
    description,
    colorClass,
    bgClass,
    active,
    onClick,
}: StatCardProps) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active} className="text-left">
            <Card
                className={cn(
                    "group relative overflow-hidden border-border/60 bg-background/50 backdrop-blur-xl transition-all hover:border-primary/20 hover:shadow-md",
                    active && "border-primary/40 ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
                )}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {title}
                    </CardTitle>
                    <div className={cn("rounded-full p-2 transition-colors group-hover:bg-background", bgClass)}>
                        <Icon className={cn("h-4 w-4", colorClass)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-bold text-foreground">
                            <NumberTicker value={value} type="number" className="tracking-tight" />
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                    <div
                        className={cn(
                            "absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-20",
                            bgClass.replace("/10", "/30"),
                            active && "opacity-20",
                        )}
                    />
                </CardContent>
            </Card>
        </button>
    );
}

export function TicketsStats({ counts, activeStatus, onSelectStatus }: TicketsStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <StatCard
                title="Novos & Abertos"
                value={counts.open}
                icon={Inbox}
                colorClass="text-blue-600 dark:text-blue-400"
                bgClass="bg-blue-500/10"
                description="Fila de atendimento pronta para acao."
                active={activeStatus === "open"}
                onClick={() => onSelectStatus("open")}
            />

            <StatCard
                title="Em Analise"
                value={counts.pending}
                icon={Clock}
                colorClass="text-amber-600 dark:text-amber-400"
                bgClass="bg-amber-500/10"
                description="Chamados aguardando andamento ou resposta."
                active={activeStatus === "pending"}
                onClick={() => onSelectStatus("pending")}
            />

            <StatCard
                title="Finalizados"
                value={counts.closed}
                icon={CheckCircle2}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="bg-emerald-500/10"
                description="Historico encerrado conforme o periodo filtrado."
                active={activeStatus === "closed"}
                onClick={() => onSelectStatus("closed")}
            />
        </div>
    );
}
