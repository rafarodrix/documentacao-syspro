import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { getCadastrosCompaniesData } from "@/actions/platform/get-cadastros-data";
import { CompanyTab } from "@/components/platform/cadastros/company/CompanyTab";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosEmpresaPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.empresa.allowed] as Role[],
    CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked,
  );
  const result = await getCadastrosCompaniesData();

  if ("error" in result) return <div>Erro: {result.error}</div>;

  if (!hasPermission(session.role, "companies:view")) return <CadastrosAccessDenied />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Cadastro de Empresa"
        description="Gerencie os dados cadastrais e fiscais das organizacoes."
        isGlobalView={result.isGlobalView}
      />
      <CompanyTab
        data={result.companies}
        canCreate={hasPermission(session.role, "companies:create")}
        canEdit={hasPermission(session.role, "companies:edit")}
        canToggleStatus={hasPermission(session.role, "companies:status")}
        canDelete={session.role === Role.ADMIN}
      />
    </div>
  );
}

