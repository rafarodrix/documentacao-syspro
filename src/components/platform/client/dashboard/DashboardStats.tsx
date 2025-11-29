import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket, CheckCircle2, ExternalLink, Clock, Activity, ArrowUpRight } from "lucide-react"
import Link from "next/link"

interface DashboardStatsProps {
    kpis: { open: number; resolved: number }
}

export function DashboardStats({ kpis }: DashboardStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Card Abertos */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:border-blue-500/30 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
                    <Ticket className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.open}</div>
                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Aguardando
                    </p>
                </CardContent>
            </Card>

            {/* Card Resolvidos */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-green-500/5 hover:border-green-500/30 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Resolvidos</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.resolved}</div>
                    <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Finalizados
                    </p>
                </CardContent>
            </Card>

            {/* Card Docs */}
            <Link href="/docs" className="block h-full">
                <Card className="h-full border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:border-purple-500/30 transition-all cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Manual</CardTitle>
                        <ExternalLink className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium mt-1">Dúvidas?</div>
                        <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                            Acessar Wiki <ArrowUpRight className="h-3 w-3" />
                        </p>
                    </CardContent>
                </Card>
            </Link>
        </div>
    )
}