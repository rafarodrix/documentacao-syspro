"use client";

import type { Prisma } from "@prisma/client";
import type { ElementType } from "react";
import { Card, CardContent } from "@dosc-syspro/ui";
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
        <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {title}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                        <div className="text-2xl font-semibold text-foreground">
                            <NumberTicker
                                value={value}
                                type={type}
                                decimalPlaces={decimalPlaces}
                                className="tracking-tight"
                            />
                        </div>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                </div>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border", bgClass)}>
                    <Icon className={cn("h-4 w-4", colorClass)} />
                </div>
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
            {/* ds-allow: surface accent */}
            <StatCard
                title="Receita Liquida Mensal"
                value={monthlyRevenue}
                type="currency"
                decimalPlaces={2}
                icon={DollarSign}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="border-emerald-500/20 bg-emerald-500/10"
                description="Apos impostos e repasses."
            />

            {/* ds-allow: surface accent */}
            <StatCard
                title="Contratos Ativos"
                value={activeContracts.length}
                type="number"
                icon={Users}
                colorClass="text-blue-600 dark:text-blue-400"
                bgClass="border-blue-500/20 bg-blue-500/10"
                description={`${totalContracts} contratos cadastrados no total.`}
            />

            {/* ds-allow: surface accent */}
            <StatCard
                title="Media do Percentual"
                value={avgPercentage / 100}
                type="percent"
                decimalPlaces={2}
                icon={Activity}
                colorClass="text-amber-600 dark:text-amber-400"
                bgClass="border-amber-500/20 bg-amber-500/10"
                description="Aliquota media aplicada na base do cliente."
            />
        </div>
    );
}
