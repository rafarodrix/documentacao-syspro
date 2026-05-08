"use client";

import type { Prisma } from "@prisma/client";
import type { ElementType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { DollarSign, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/magicui/number-ticker";

type ContractLike = {
    status: string;
    minimumWage: number | Prisma.Decimal | string;
    percentage: number | Prisma.Decimal | string;
    taxRate: number | Prisma.Decimal | string;
    programmerRate: number | Prisma.Decimal | string;
};

interface StatCardProps {
    title: string;
    value: number;
    type?: "currency" | "percent" | "number";
    icon: ElementType;
    description: string;
    colorClass: string;
    bgClass: string;
    decimalPlaces?: number;
}

const toNumber = (value: number | Prisma.Decimal | string) => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    return value.toNumber();
};

function StatCard({
    title, value, type = "number", icon: Icon, description, colorClass, bgClass, decimalPlaces = 0,
}: StatCardProps) {
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
                <div className="flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-foreground">
                        <NumberTicker
                            value={value}
                            type={type}
                            decimalPlaces={decimalPlaces}
                            className="tracking-tight"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
                <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-20", bgClass.replace("/10", "/30"))} />
            </CardContent>
        </Card>
    );
}

export function ContractStats({ contracts }: { contracts: ContractLike[] }) {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((contract) => contract.status === "ACTIVE");

    const monthlyRevenue = activeContracts.reduce((acc, contract) => {
        const minimumWage = toNumber(contract.minimumWage);
        const percentage = toNumber(contract.percentage);
        const taxRate = toNumber(contract.taxRate);
        const partnerRate = toNumber(contract.programmerRate);

        const gross = minimumWage * (percentage / 100);
        const taxDeduction = gross * (taxRate / 100);
        const partnerDeduction = gross * ((partnerRate || 0) / 100);
        return acc + (gross - taxDeduction - partnerDeduction);
    }, 0);

    const avgPercentage = activeContracts.length > 0
        ? activeContracts.reduce((acc, contract) => acc + toNumber(contract.percentage), 0) / activeContracts.length
        : 0;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Receita Liquida Mensal"
                value={monthlyRevenue}
                type="currency"
                decimalPlaces={2}
                icon={DollarSign}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="bg-emerald-500/10"
                description="Apos deducao de impostos e repasses."
            />

            <StatCard
                title="Contratos Ativos"
                value={activeContracts.length}
                type="number"
                icon={Users}
                colorClass="text-blue-600 dark:text-blue-400"
                bgClass="bg-blue-500/10"
                description={`Total de ${totalContracts} contratos cadastrados.`}
            />

            <StatCard
                title="Media do Percentual"
                value={avgPercentage / 100}
                type="percent"
                decimalPlaces={2}
                icon={Activity}
                colorClass="text-amber-600 dark:text-amber-400"
                bgClass="bg-amber-500/10"
                description="Media aplicada sobre o valor base do cliente."
            />
        </div>
    );
}

