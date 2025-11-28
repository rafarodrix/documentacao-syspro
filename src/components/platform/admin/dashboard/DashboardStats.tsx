"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Activity, ServerCrash, TrendingUp } from "lucide-react";
import NumberTicker from "@/components/magicui/NumberTicker";

interface DashboardStatsProps {
    companiesCount: number;
    usersCount: number;
}

export function DashboardStats({ companiesCount, usersCount }: DashboardStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* KPI: Empresas */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-blue-500/5 hover:shadow-md hover:border-blue-500/20 transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Building2 className="w-16 h-16 text-blue-500 -rotate-12" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Empresas Ativas
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <Building2 className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                        <NumberTicker value={companiesCount} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-500 font-medium">+2</span> este mês
                    </p>
                </CardContent>
            </Card>

            {/* KPI: Usuários */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-purple-500/5 hover:shadow-md hover:border-purple-500/20 transition-all duration-300 group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-16 h-16 text-purple-500 rotate-12" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Usuários Totais
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Users className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                        <NumberTicker value={usersCount} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Incluindo admins e clientes
                    </p>
                </CardContent>
            </Card>

            {/* KPI: Status */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-emerald-500/5 hover:shadow-md hover:border-emerald-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Status do Sistema
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center animate-pulse text-emerald-500">
                        <Activity className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Operacional</div>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-mono">
                        Latência média: 24ms
                    </p>
                </CardContent>
            </Card>

            {/* KPI: Erros */}
            <Card className="relative overflow-hidden border-border/50 bg-gradient-to-br from-background to-red-500/5 hover:shadow-md hover:border-red-500/20 transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Erros Críticos
                    </CardTitle>
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                        <ServerCrash className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">0</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Últimas 24 horas
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}