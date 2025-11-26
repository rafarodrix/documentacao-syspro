import { getContractsAction } from "../_actions/contract-actions";
import { getCompaniesAction } from "../_actions/company-actions";
import { ContractSheet } from "@/components/platform/admin/ContractSheet";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, TrendingUp, FileText } from "lucide-react";

export default async function ContratosPage() {
    const [contractsRes, companiesRes] = await Promise.all([
        getContractsAction(),
        getCompaniesAction()
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const companies = companiesRes.success && companiesRes.data ? companiesRes.data : [];

    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                        Gestão de Contratos
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Administre os acordos e repasses financeiros.
                    </p>
                </div>
                <ContractSheet companies={companyOptions} />
            </div>

            {/* Tabela */}
            <Card className="border-border/50 shadow-sm overflow-hidden bg-background/60 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Base (Sal. Mín.)</TableHead>
                                <TableHead>Percentual</TableHead>
                                <TableHead>Valor Bruto</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Líquido Est.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        Nenhum contrato ativo no momento.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((contract: any) => {
                                    const bruto = contract.minimumWage * (contract.percentage / 100);
                                    const liquido = bruto - (bruto * (contract.taxRate / 100));

                                    return (
                                        <TableRow key={contract.id} className="group hover:bg-muted/40">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {contract.company.razaoSocial}
                                                </div>
                                            </TableCell>
                                            <TableCell>R$ {contract.minimumWage.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono">
                                                    {contract.percentage}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                R$ {bruto.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={contract.status === 'ACTIVE' ? 'default' : 'destructive'} className="text-[10px]">
                                                    {contract.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">
                                                R$ {liquido.toFixed(2)}
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