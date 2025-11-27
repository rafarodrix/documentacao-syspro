import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
// 1. Importe o componente que acabamos de criar
import NumberTicker from "@/components/magicui/number-ticker";

// --- HELPERS ---
const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

const formatPercent = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2 }).format(val / 100);

// --- SUB-COMPONENTE STATCARD ---
interface StatCardProps {
    title: string;
    value: number;
    formatter?: (val: number) => string;
    icon: React.ElementType;
    description: string;
    colorClass: string;
    bgClass: string;
    decimalPlaces?: number;
}

function StatCard({
    title, value, formatter, icon: Icon, description, colorClass, bgClass, decimalPlaces = 0
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
                        {/* 2. Uso do NumberTicker com o formatter */}
                        <NumberTicker
                            value={value}
                            formatter={formatter}
                            decimalPlaces={decimalPlaces}
                            className="tracking-tight"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {description}
                </p>
                <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity group-hover:opacity-20", bgClass.replace("/10", "/30"))} />
            </CardContent>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function ContractStats({ contracts }: { contracts: any[] }) {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');

    const monthlyRevenue = activeContracts.reduce((acc, c) => {
        const gross = c.minimumWage * (c.percentage / 100);
        const taxDed = gross * (c.taxRate / 100);
        const progDed = gross * ((c.programmerRate || 0) / 100);
        return acc + (gross - taxDed - progDed);
    }, 0);

    const avgPercentage = activeContracts.length > 0
        ? activeContracts.reduce((acc, c) => acc + c.percentage, 0) / activeContracts.length
        : 0;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <StatCard
                title="Receita Líquida Mensal"
                value={monthlyRevenue}
                formatter={formatCurrency}
                decimalPlaces={2} // Moeda precisa de 2 casas decimais durante a animação
                icon={DollarSign}
                colorClass="text-emerald-600 dark:text-emerald-400"
                bgClass="bg-emerald-500/10"
                description="Após dedução de impostos e repasses"
            />

            <StatCard
                title="Contratos Ativos"
                value={activeContracts.length}
                // Sem formatter específico, usa padrão numérico
                icon={Users}
                colorClass="text-blue-600 dark:text-blue-400"
                bgClass="bg-blue-500/10"
                description={`De um total de ${totalContracts} registros`}
            />

            <StatCard
                title="Ticket Médio (%)"
                value={avgPercentage}
                formatter={formatPercent}
                decimalPlaces={2} // Percentual também fica melhor com decimais
                icon={Activity}
                colorClass="text-amber-600 dark:text-amber-400"
                bgClass="bg-amber-500/10"
                description="Média aplicada sobre o salário base"
            />
        </div>
    );
}