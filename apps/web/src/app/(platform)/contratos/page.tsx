import { getContractsAction } from "@/actions/admin/contract-actions";
import { getCompaniesAction } from "@/actions/admin/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";
import { redirect } from "next/navigation";

import { ContractSheet } from "@/components/platform/admin/contratos/ContractSheet";
import { BulkReadjustDialog } from "@/components/platform/admin/contratos/BulkReadjustDialog";
import { ContractStats } from "@/components/platform/admin/contratos/ContractStats";
import { ContractsTable } from "@/components/platform/admin/contratos/ContractsTable";

export default async function ContratosPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;

    // Guard: Apenas quem tem permissao de ver contratos
    if (!hasPermission(role, "contracts:view")) {
        redirect("/");
    }

    const [contractsRes, companiesRes] = await Promise.all([
        getContractsAction(),
        getCompaniesAction(),
    ]);

    const contracts = contractsRes.success && contractsRes.data ? contractsRes.data : [];
    const companies = companiesRes.success && companiesRes.data ? companiesRes.data : [];

    const companyOptions = companies.map((c: { id: string; razaoSocial: string }) => ({
        id: c.id,
        razaoSocial: c.razaoSocial,
    }));

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6">
                <div className="space-y-1.5">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Gestao de Contratos
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl">
                        Controle financeiro, reajustes globais e monitoramento de repasses.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <BulkReadjustDialog />
                    <div className="h-8 w-[1px] bg-border/60 hidden sm:block mx-1" />
                    <ContractSheet companies={companyOptions} />
                </div>
            </div>
            <section className="space-y-4">
                <ContractStats contracts={contracts} />
            </section>
            <section className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
                    <ContractsTable contracts={contracts} />
                </div>
            </section>
        </div>
    );
}
