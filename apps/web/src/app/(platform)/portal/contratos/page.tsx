import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { getSettingsContractsAdminViewData } from "@/features/settings/application/settings-read.queries";
import { BulkReadjustDialog, ContractSheet, ContractStats, ContractsTable } from "@/features/contracts/interface";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { PageHeader } from "@/components/patterns";

interface ContratosPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContratosPage({ searchParams }: ContratosPageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("contracts:view", { acceptCompanyScope: true }))) {
    redirect("/portal");
  }

  const params = searchParams ? await searchParams : undefined;
  const mode = typeof params?.mode === "string" ? params.mode : "";
  const isCreateMode = mode === "create";
  const canCreateContracts = await currentUserHasAnyPermission(["contracts:create", "contracts:edit"], {
    acceptCompanyScope: true,
  });
  const canEditContracts = await currentUserHasPermission("contracts:edit");
  const canDeleteContracts = await currentUserHasPermission("contracts:delete");
  if (isCreateMode && !canCreateContracts) {
    redirect("/portal/contratos");
  }
  const contractsView = await getSettingsContractsAdminViewData();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader
        title="Contratos"
        description="Inativar o ultimo contrato ativo bloqueia empresa e usuarios cliente vinculados."
        actions={!isCreateMode ? (
          <div className="flex items-center gap-3">
            <BulkReadjustDialog />
            {canCreateContracts ? <ContractSheet companies={contractsView.companies} mode="button" /> : null}
          </div>
        ) : undefined}
      />

      {isCreateMode ? (
        <ContractSheet companies={contractsView.companies} mode="full" />
      ) : (
        <>
          <ContractStats contracts={contractsView.contracts} />
          <ContractsTable
            contracts={contractsView.contracts}
            canEdit={canEditContracts}
            canDelete={canDeleteContracts}
          />
        </>
      )}
    </div>
  );
}
