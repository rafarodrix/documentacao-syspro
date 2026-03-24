"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Inbox, Clock, CheckCircle2 } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { TicketStatusCounts } from "./types"
import type { TicketStatusGroup } from "@dosc-syspro/core"

interface TicketsStatsProps {
    counts: TicketStatusCounts
    activeStatus: TicketStatusGroup
    onSelectStatus: (status: TicketStatusGroup) => void
}

export function TicketsStats({ counts, activeStatus, onSelectStatus }: TicketsStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <KpiCard
                title="Novos & Abertos"
                value={counts.open}
                icon={Inbox}
                color="blue"
                label="Fila de atendimento"
                active={activeStatus === "open"}
                onClick={() => onSelectStatus("open")}
            />
            <KpiCard
                title="Em Analise"
                value={counts.pending}
                icon={Clock}
                color="amber"
                label="Aguardando resposta"
                active={activeStatus === "pending"}
                onClick={() => onSelectStatus("pending")}
            />
            <KpiCard
                title="Finalizados"
                value={counts.closed}
                icon={CheckCircle2}
                color="green"
                label="Historico recente"
                active={activeStatus === "closed"}
                onClick={() => onSelectStatus("closed")}
            />
        </div>
    )
}

type KpiColor = "blue" | "amber" | "green" | "red";

interface KpiCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: KpiColor;
    label: string;
    active: boolean;
    onClick: () => void;
}

function KpiCard({ title, value, icon: Icon, color, label, active, onClick }: KpiCardProps) {
    const colors: Record<KpiColor, string> = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        red: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const iconColors: Record<KpiColor, string> = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        green: "text-emerald-500",
        red: "text-red-500"
    };

    return (
        <button type="button" onClick={onClick} aria-pressed={active} className="text-left">
            <Card className={`${colors[color]} shadow-sm border transition-all hover:scale-[1.01] hover:shadow-md ${active ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className={`h-4 w-4 ${iconColors[color]}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs opacity-80">{label}</p>
                </CardContent>
            </Card>
        </button>
    )
}
