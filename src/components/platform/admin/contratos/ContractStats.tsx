import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Activity } from "lucide-react";

// Helper
const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
const formatPercent = (val: number) => new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2 }).format(val / 100);

export function ContractStats({ contracts }: { contracts: any[] }) {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');

    // CÁLCULO CORRIGIDO DA RECEITA LÍQUIDA TOTAL
    const monthlyRevenue = activeContracts.reduce((acc, c) => {
        const gross = c.minimumWage * (c.percentage / 100);

        // Deduções
        const taxDed = gross * (c.taxRate / 100);
        const progDed = gross * ((c.programmerRate || 0) / 100);

        // Líquido Real (O que entra na conta da empresa/gestor)
        const net = gross - taxDed - progDed;

        return acc + net;
    }, 0);

    const avgPercentage = activeContracts.length > 0
        ? activeContracts.reduce((acc, c) => acc + c.percentage, 0) / activeContracts.length
        : 0;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Receita */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receita Líquida Mensal</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(monthlyRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Já deduzidos impostos e repasses dev</p>
                </CardContent>
            </Card>

            {/* Card 2: Volume */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Ativos</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{activeContracts.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">De um total de {totalContracts} registros</p>
                </CardContent>
            </Card>

            {/* Card 3: Média */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio (%)</CardTitle>
                    <Activity className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-foreground">{formatPercent(avgPercentage)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Média percentual sobre o salário</p>
                </CardContent>
            </Card>
        </div>
    );
}