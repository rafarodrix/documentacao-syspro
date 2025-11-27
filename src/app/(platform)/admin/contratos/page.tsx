import { getContractsAction } from "../_actions/contract-actions";
import { getCompaniesAction } from "../_actions/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes Refatorados
import { ContractSheet } from "@/components/platform/admin/contratos/ContractSheet";
import { BulkReadjustDialog } from "@/components/platform/admin/contratos/BulkReadjustDialog";
import { ContractStats } from "@/components/platform/admin/contratos/ContractStats";
import { ContractsTable } from "@/components/platform/admin/contratos/ContractsTable";

export default async function ContratosPage() {
    // 1. Segurança
    const session = await getProtectedSession();
    if (!session || session.role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    // 2. Carregamento de Dados
    const [contractsRes, companiesRes] = await Promise.all([
        getContractsAction(),
        getCompaniesAction()
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const companies = companiesRes.success && companiesRes.data ? companiesRes.data : [];
    const companyOptions = companies.map(c => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {/* HEADER E AÇÕES GLOBAIS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestão de Contratos</h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Supervisão financeira e controle de repasses contratuais.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Botão de Reajuste em Massa */}
                    <BulkReadjustDialog />
                    {/* Botão de Novo Contrato */}
                    <ContractSheet companies={companyOptions} />
                </div>
            </div>

            {/* KPIS / DASHBOARD */}
            <ContractStats contracts={contracts} />

            {/* TABELA DE DADOS */}
            <ContractsTable contracts={contracts} />

        </div>
    );
}