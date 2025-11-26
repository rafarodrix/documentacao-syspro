import { getContractsAction } from "../_actions/contract-actions";
import { getCompaniesAction } from "../_actions/company-actions";
import { ContractSheet } from "@/components/platform/admin/ContractSheet";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Building2,
    DollarSign,
    TrendingUp,
    Users,
    Activity,
    CalendarClock,
    FileText
} from "lucide-react";

// Helper para formatar moeda
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
};

// Helper para formatar porcentagem
const formatPercent = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
        style: "percent",
        minimumFractionDigits: 2,
    }).format(value / 100);
};

export default async function ContratosPage() {
    // Carregamento paralelo de dados
    const [contractsRes, companiesRes] = await Promise.all([
        getContractsAction(),
        getCompaniesAction()
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const companies = companiesRes.success && companiesRes.data ? companiesRes.data : [];
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    // --- CÁLCULO DE MÉTRICAS (KPIs) ---
    const totalContracts = contracts.length;

    // Filtra apenas ativos para cálculo financeiro real
    const activeContracts = contracts.filter((c: any) => c.status === 'ACTIVE');

    const monthlyRevenue = activeContracts.reduce((acc: number, c: any) => {
        const gross = c.minimumWage * (c.percentage / 100);
        const net = gross - (gross * (c.taxRate / 100)); // Receita líquida estimada
        return acc + net;
    }, 0);

    const avgPercentage = activeContracts.length > 0
        ? activeContracts.reduce((acc: number, c: any) => acc + c.percentage, 0) / activeContracts.length
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Gestão de Contratos
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Supervisão financeira e controle de repasses contratuais.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ContractSheet companies={companyOptions} />
                </div>
            </div>

            {/* --- KPI CARDS (Dashboard Mini) --- */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Receita Mensal Estimada
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(monthlyRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Baseado em {activeContracts.length} contratos ativos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Volume de Contratos
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {totalContracts}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {contracts.length - activeContracts.length} inativos ou suspensos
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 backdrop-blur-sm border-border/60 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Média de Percentual
                        </CardTitle>
                        <Activity className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatPercent(avgPercentage)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Média aplicada sobre o salário base
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* --- TABELA PRINCIPAL --- */}
            <Card className="border-border/50 shadow-md bg-background overflow-hidden">
                <div className="p-1 bg-muted/30 border-b"></div> {/* Linha estética superior */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[300px]">Empresa / Parceiro</TableHead>
                                <TableHead>Início</TableHead>
                                <TableHead>Base de Cálculo</TableHead>
                                <TableHead>Alíquota (%)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Repasse Líquido</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <FileText className="h-8 w-8 opacity-20" />
                                            <p>Nenhum contrato registrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((contract: any) => {
                                    // Cálculos individuais para exibição
                                    const bruto = contract.minimumWage * (contract.percentage / 100);
                                    const liquido = bruto - (bruto * (contract.taxRate / 100));
                                    const isActive = contract.status === 'ACTIVE';

                                    return (
                                        <TableRow key={contract.id} className="group hover:bg-muted/30 transition-colors">
                                            {/* Empresa */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-primary/5 text-primary border border-primary/10">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground">
                                                            {contract.company.razaoSocial}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground font-mono">
                                                            CNPJ: {contract.company.cnpj}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Data */}
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                    <CalendarClock className="h-3 w-3" />
                                                    {new Date(contract.startDate).toLocaleDateString('pt-BR')}
                                                </div>
                                            </TableCell>

                                            {/* Salário Base */}
                                            <TableCell>
                                                <div className="font-mono text-sm">
                                                    {formatCurrency(contract.minimumWage)}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Salário Mín.</p>
                                            </TableCell>

                                            {/* Percentual */}
                                            <TableCell>
                                                <Badge variant="outline" className="bg-background font-mono">
                                                    {contract.percentage}%
                                                </Badge>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={`
                                                        ${isActive
                                                            ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"
                                                            : "bg-gray-100 text-gray-600 border-gray-200"}
                                                        font-medium px-2.5 py-0.5 text-xs transition-colors
                                                    `}
                                                >
                                                    {isActive ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>

                                            {/* Valor Final */}
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-bold font-mono ${isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                        {formatCurrency(liquido)}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Bruto: {formatCurrency(bruto)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}