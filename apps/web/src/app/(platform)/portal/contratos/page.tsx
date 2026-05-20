import { requireSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
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
    <div className="flex w-full flex-col gap-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Contratos</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Gerencie vigencia, calculo e bloqueio operacional dos contratos.
          </p>
        </div>

        {!isCreateMode ? (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <BulkReadjustDialog />
            {canCreateContracts ? <ContractSheet companies={contractsView.companies} mode="button" /> : null}
          </div>
        ) : null}
      </div>

      {isCreateMode ? (
        <ContractSheet companies={contractsView.companies} mode="full" />
      ) : (
        <ContractsTable
          contracts={contractsView.contracts}
          canEdit={canEditContracts}
          canDelete={canDeleteContracts}
        />
      )}
    </div>
  );
}
