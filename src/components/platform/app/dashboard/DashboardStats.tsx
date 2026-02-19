"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Building2,
    Users,
    Activity,
    Globe,
    Zap,
    TrendingUp,
    AlertTriangle
} from "lucide-react";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Tipagem para os dados vindos da sua nova API/Prisma
interface SefazKPI {
    uf: string;
    status: 'ONLINE' | 'UNSTABLE' | 'OFFLINE';
    latency: number;
}

interface DashboardStatsProps {
    companiesCount: number;
    usersCount: number;
    sefazNfe: SefazKPI; // Status NF-e (ex: MG)
    sefazNfce: SefazKPI; // Status NFC-e (ex: MG)
}

export function DashboardStats({
    companiesCount,
    usersCount,
    sefazNfe,
    sefazNfce
}: DashboardStatsProps) {

    // Função auxiliar para cores de status
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'ONLINE': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Operacional' };
            case 'UNSTABLE': return { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Instável' };
            default: return { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Indisponível' };
        }
    };

    const nfeConfig = getStatusConfig(sefazNfe.status);
    const nfceConfig = getStatusConfig(sefazNfce.status);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* 1. KPI: Empresas */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:shadow-md transition-all group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Building2 className="w-16 h-16 text-blue-500 -rotate-12" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Empresas Ativas</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Building2 className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <NumberTicker value={companiesCount} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-500 font-medium">+2</span> este mês
                    </p>
                </CardContent>
            </Card>

            {/* 2. KPI: Usuários */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:shadow-md transition-all group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-purple-500 rotate-12" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Usuários Totais</CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Users className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <NumberTicker value={usersCount} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Sessões ativas no momento</p>
                </CardContent>
            </Card>

            {/* 3. KPI: SEFAZ NF-e (Dinâmico) */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-emerald-500/5 hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        SEFAZ {sefazNfe.uf} (NF-e)
                    </CardTitle>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", nfeConfig.bg, nfeConfig.color)}>
                        <Zap className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", nfeConfig.color)}>
                        {nfeConfig.label}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground font-mono">
                            Latência: {sefazNfe.latency}ms
                        </p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase border-emerald-500/20 text-emerald-500">
                            Produção
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* 4. KPI: SEFAZ NFC-e (Dinâmico) */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-amber-500/5 hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        SEFAZ {sefazNfce.uf} (NFC-e)
                    </CardTitle>
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", nfceConfig.bg, nfceConfig.color)}>
                        <Activity className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", nfceConfig.color)}>
                        {nfceConfig.label}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground font-mono">
                            Ping: {sefazNfce.latency}ms
                        </p>
                        {sefazNfce.status === 'UNSTABLE' && (
                            <AlertTriangle className="h-3 w-3 text-amber-500 animate-bounce" />
                        )}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}