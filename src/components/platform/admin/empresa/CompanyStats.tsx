"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import NumberTicker from "@/components/magicui/NumberTicker"; // Reusando o componente criado anteriormente

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    description: string;
    colorClass: string;
    bgClass: string;
}

function StatCard({ title, value, icon: Icon, description, colorClass, bgClass }: StatCardProps) {
    return (
        <Card className="group relative overflow-hidden border-border/60 bg-background/50 backdrop-blur-xl transition-all hover:border-primary/20 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase text-[11px]">
                    {title}
                </CardTitle>
                <div className={cn("p-2 rounded-full transition-colors group-hover:bg-background", bgClass)}>
                    <Icon className={cn("h-4 w-4", colorClass)} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">
                    <NumberTicker value={value} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

export function CompanyStats({ companies }: { companies: any[] }) {
    const total = companies.length;
    const active = companies.filter(c => c.status === 'ACTIVE').length;
    // Exemplo: Assumindo que INACTIVE ou PENDING_DOCS requer atenção
    const attention = companies.filter(c => c.status !== 'ACTIVE').length;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Total de Organizações"
                value={total}
                icon={Building2}
                colorClass="text-blue-600"
                bgClass="bg-blue-500/10"
                description="Empresas cadastradas na base"
            />
            <StatCard
                title="Empresas Ativas"
                value={active}
                icon={CheckCircle2}
                colorClass="text-emerald-600"
                bgClass="bg-emerald-500/10"
                description="Clientes operando normalmente"
            />
            <StatCard
                title="Requer Atenção"
                value={attention}
                icon={AlertCircle}
                colorClass="text-amber-600"
                bgClass="bg-amber-500/10"
                description="Inativas ou com pendências"
            />
        </div>
    );
}