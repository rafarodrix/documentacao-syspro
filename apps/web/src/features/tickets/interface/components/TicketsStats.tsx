"use client";

import type { ElementType } from "react";
import { Inbox, Clock, CheckCircle2 } from "lucide-react";
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
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "group min-h-28 rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/20",
                active && "border-primary/50 bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]",
            )}
        >
            <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {title}
                    </span>
                    <span className={cn("rounded-md p-2 transition-colors group-hover:bg-background", bgClass)}>
                        <Icon className={cn("h-4 w-4", colorClass)} />
                    </span>
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-semibold leading-none text-foreground">
                            <NumberTicker value={value} type="number" className="tracking-tight" />
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
        </button>
    );
}

export function TicketsStats({ counts, activeStatus, onSelectStatus }: TicketsStatsProps) {
    return (
        <div className="grid gap-3 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
