import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Clock, HelpCircle, CheckCircle2, Timer } from "lucide-react"

interface DashboardStatsProps {
    kpis: {
        open: number
        pending: number
        resolved: number
        unknown: number
    }
}

export function DashboardStats({ kpis }: DashboardStatsProps) {
    const items = [
        {
            title: "Abertos",
            value: kpis.open,
            icon: Clock,
            color: "text-blue-500",
            bg: "from-background to-blue-500/5 hover:border-blue-500/30",
        },
        {
            title: "Pendentes",
            value: kpis.pending,
            icon: Timer,
            color: "text-yellow-500",
            bg: "from-background to-yellow-500/5 hover:border-yellow-500/30",
        },
        {
            title: "Resolvidos",
            value: kpis.resolved,
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "from-background to-green-500/5 hover:border-green-500/30",
        },
        {
            title: "Desconhecidos",
            value: kpis.unknown,
            icon: HelpCircle,
            color: "text-gray-400",
            bg: "from-background to-gray-500/5 hover:border-gray-500/30",
        },
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, i) => {
                const Icon = item.icon
                return (
                    <Card
                        key={i}
                        className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${item.bg} transition-all`}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {item.title}
                            </CardTitle>
                            <Icon className={`h-4 w-4 ${item.color}`} />
                        </CardHeader>

                        <CardContent>
                            <div className="text-3xl font-bold">{item.value}</div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
