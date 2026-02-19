import { getContractsAction } from "../../../../actions/admin/contract-actions";
import { getCompaniesAction } from "../../../../actions/admin/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes
import { ContractSheet } from "@/components/platform/app/contratos/ContractSheet";
import { BulkReadjustDialog } from "@/components/platform/app/contratos/BulkReadjustDialog";
import { ContractStats } from "@/components/platform/app/contratos/ContractStats";
import { ContractsTable } from "@/components/platform/app/contratos/ContractsTable";

export default async function ContratosPage() {
    // 1. Camada de Segurança
    const session = await getProtectedSession();
    if (!session || session.role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    // 2. Carregamento Paralelo de Dados (Performance)
    const [contractsRes, companiesRes] = await Promise.all([
        getContractsAction(),
        getCompaniesAction()
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const companies = companiesRes.success && companiesRes.data ? companiesRes.data : [];

    // Prepara opções para o select
    const companyOptions = companies.map((c: { id: any; razaoSocial: any; }) => ({ id: c.id, razaoSocial: c.razaoSocial }));

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">

            {/* --- HEADER DA PÁGINA --- */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Gestão de Contratos
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Controle financeiro, reajustes globais e monitoramento de repasses.
                    </p>
                </div>

                {/* Área de Ações */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Ações de Manutenção */}
                    <BulkReadjustDialog />

                    {/* Divisor Visual (apenas desktop) */}
                    <div className="h-8 w-[1px] bg-border/60 hidden sm:block mx-1" />

                    {/* Ação Principal */}
                    <ContractSheet companies={companyOptions} />
                </div>
            </div>

            {/* --- DASHBOARD / KPIS --- */}
            <section className="space-y-4">
                <ContractStats contracts={contracts} />
            </section>

            {/* --- ÁREA OPERACIONAL (TABELA) --- */}
            <section className="space-y-4">
                {/* Opcional: Aqui você poderia adicionar filtros de busca antes da tabela */}
                <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
                    <ContractsTable contracts={contracts} />
                </div>
            </section>

        </div>
    );
}