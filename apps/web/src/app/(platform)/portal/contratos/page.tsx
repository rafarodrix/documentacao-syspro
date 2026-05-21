import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/patterns";
import { getSettingsContractsAdminViewData } from "@/features/settings/application/settings-read.queries";
import { BulkReadjustDialog, ContractSheet, ContractsTable } from "@/features/contracts/interface";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";

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
  const contractId = typeof params?.id === "string" ? params.id : "";
  const isCreateMode = mode === "create";
  const isEditMode = mode === "edit" && !!contractId;
  const canCreateContracts = await currentUserHasAnyPermission(["contracts:create", "contracts:edit"], {
    acceptCompanyScope: true,
  });
  const canEditContracts = await currentUserHasPermission("contracts:edit");
  const canDeleteContracts = await currentUserHasPermission("contracts:delete");
  if ((isCreateMode || isEditMode) && !canCreateContracts) {
    redirect("/portal/contratos");
  }
  const contractsView = await getSettingsContractsAdminViewData();
  const editContract = isEditMode ? contractsView.contracts.find((item) => item.id === contractId) ?? null : null;

  if (isEditMode && !editContract) {
    redirect("/portal/contratos");
  }

  return (
    <PageShell className="flex w-full flex-col gap-6 pb-20">
      <PageHeader
        title="Contratos"
        description="Gerencie vigencia, calculo e bloqueio operacional dos contratos."
        actions={
          !isCreateMode && !isEditMode ? (
            <div className="flex w-full items-center gap-2 sm:w-auto">
            <BulkReadjustDialog />
            {canCreateContracts ? <ContractSheet companies={contractsView.companies} mode="button" /> : null}
            </div>
          ) : null
        }
      />

      {isCreateMode || isEditMode ? (
        <ContractSheet companies={contractsView.companies} mode="full" contract={editContract} />
      ) : (
        <ContractsTable
          contracts={contractsView.contracts}
          canEdit={canEditContracts}
          canDelete={canDeleteContracts}
        />
      )}
    </PageShell>
  );
}
