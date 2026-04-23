import { requireSession } from "@/lib/auth-helpers";
import { getSettingsContractsAdminViewData } from "@/features/settings/application/queries";
import { BulkReadjustDialog, ContractSheet, ContractStats, ContractsTable } from "@/features/contracts/interface";

interface ContratosPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContratosPage({ searchParams }: ContratosPageProps) {
  await requireSession();

  const params = searchParams ? await searchParams : undefined;
  const mode = typeof params?.mode === "string" ? params.mode : "";
  const isCreateMode = mode === "create";
  const contractsView = await getSettingsContractsAdminViewData();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Contratos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inativar o ultimo contrato ativo bloqueia empresa e usuarios cliente vinculados.
          </p>
        </div>
        {!isCreateMode && (
          <div className="flex items-center gap-3">
            <BulkReadjustDialog />
            <ContractSheet companies={contractsView.companies} mode="button" />
          </div>
        )}
      </div>

      {isCreateMode ? (
        <ContractSheet companies={contractsView.companies} mode="full" />
      ) : (
        <>
          <ContractStats contracts={contractsView.contracts} />
          <ContractsTable contracts={contractsView.contracts} />
        </>
      )}
    </div>
  );
}
