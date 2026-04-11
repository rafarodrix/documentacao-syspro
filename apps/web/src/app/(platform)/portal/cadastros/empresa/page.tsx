import { requireSession } from "@/lib/auth-helpers";
import { getCadastrosCompaniesAdminViewData } from "@/features/company/application/queries";
import { CompanyTab } from "@/features/company/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface CadastrosEmpresaPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CadastrosEmpresaPage({ searchParams }: CadastrosEmpresaPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const empresaParam = params?.empresa;
  const initialCompanySearch =
    typeof empresaParam === "string"
      ? empresaParam
      : Array.isArray(empresaParam)
        ? empresaParam[0] ?? ""
        : "";

  await requireSession();
  const result = await getCadastrosCompaniesAdminViewData();

  if ("error" in result) return <div>Erro: {result.error}</div>;
  const canViewCompanies = await currentUserHasPermission("companies:view");
  const canCreateCompanies = await currentUserHasPermission("companies:create");
  const canEditCompanies = await currentUserHasPermission("companies:edit", { acceptCompanyScope: true });
  const canToggleCompanies = await currentUserHasPermission("companies:status");
  const canDeleteCompanies = await currentUserHasPermission("companies:delete");

  if (!canViewCompanies) return <CadastrosAccessDenied />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Cadastro de Empresa"
        description="Gerencie os dados cadastrais e fiscais das organizacoes."
        isGlobalView={result.isGlobalView}
      />
      <CompanyTab
        data={result.companies}
        initialSearchTerm={initialCompanySearch}
        canCreate={canCreateCompanies}
        canEdit={canEditCompanies}
        canToggleStatus={canToggleCompanies}
        canDelete={canDeleteCompanies}
      />
    </div>
  );
}

