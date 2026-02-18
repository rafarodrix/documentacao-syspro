"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Inbox, Clock, AlertCircle, CheckCircle2 } from "lucide-react"

// Tipos para facilitar a lógica de contagem
export type TicketStatusGroup = "open" | "pending" | "closed";

interface TicketsStatsProps {
    tickets: any[]
    getCategory: (status: string) => TicketStatusGroup
}

export function TicketsStats({ tickets, getCategory }: TicketsStatsProps) {

    // Lógica de contagem
    const kpiOpen = tickets.filter((t) => getCategory(t.status) === "open").length;
    const kpiPending = tickets.filter((t) => getCategory(t.status) === "pending").length;
    const kpiClosed = tickets.filter((t) => getCategory(t.status) === "closed").length;

    return (
        <div className="grid gap-4 md:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <KpiCard
                title="Novos & Abertos"
                value={kpiOpen}
                icon={Inbox}
                color="blue"
                label="Fila de atendimento"
            />
            <KpiCard
                title="Em Análise"
                value={kpiPending}
                icon={Clock}
                color="amber"
                label="Aguardando resposta"
            />
            <KpiCard
                title="Finalizados"
                value={kpiClosed}
                icon={CheckCircle2}
                color="green"
                label="Histórico recente"
            />
        </div>
    )
}

// Subcomponente Card (Reutilizável)
function KpiCard({ title, value, icon: Icon, color, label }: any) {
    const colors: any = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        red: "bg-red-500/10 text-red-600 border-red-500/20"
    };
    const iconColors: any = {
        blue: "text-blue-500",
        amber: "text-amber-500",
        green: "text-emerald-500",
        red: "text-red-500"
    };

    return (
        <Card className={`${colors[color]} shadow-sm border transition-transform hover:scale-[1.01]`}>
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