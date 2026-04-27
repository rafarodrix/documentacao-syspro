import { requireSession } from "@/lib/auth-helpers";
import { getCadastrosCompaniesAdminViewData } from "@/features/company/application/queries";
import { CompanyTab } from "@/features/company/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface CadastrosEmpresaPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CadastrosEmpresaPage({ searchParams }: CadastrosEmpresaPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const empresaParam = params?.empresa;
  const pageParam = params?.page;
  const statusParam = params?.status;
  const initialCompanySearch =
    typeof empresaParam === "string"
      ? empresaParam
      : Array.isArray(empresaParam)
        ? empresaParam[0] ?? ""
        : "";
  const initialPage =
    typeof pageParam === "string"
      ? Number.parseInt(pageParam, 10) || 1
      : Array.isArray(pageParam)
        ? Number.parseInt(pageParam[0] ?? "1", 10) || 1
        : 1;
  const initialStatus =
    typeof statusParam === "string"
      ? statusParam
      : Array.isArray(statusParam)
        ? statusParam[0] ?? "ALL"
        : "ALL";
  const normalizedInitialStatus =
    initialStatus === "ACTIVE" ||
    initialStatus === "INACTIVE" ||
    initialStatus === "SUSPENDED" ||
    initialStatus === "PENDING_DOCS"
      ? initialStatus
      : "ALL";

  await requireSession();
  const result = await getCadastrosCompaniesAdminViewData({
    search: initialCompanySearch,
    status: normalizedInitialStatus,
    page: initialPage,
    pageSize: 50,
  });

  if ("error" in result) return <div>Erro: {result.error}</div>;
  const canViewCompanies = await currentUserHasAnyPermission(["companies:view", "companies:view_own", "companies:view_all"], {
    acceptCompanyScope: true,
  });
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
        data={result.list.items}
        initialPagination={{
          page: result.list.pagination.page,
          pageSize: result.list.pagination.pageSize,
          total: result.list.pagination.total,
          totalPages: Math.max(1, Math.ceil(result.list.pagination.total / result.list.pagination.pageSize)),
          hasPreviousPage: result.list.pagination.hasPreviousPage,
          hasNextPage: result.list.pagination.hasNextPage,
        }}
        initialSearchTerm={initialCompanySearch}
        initialStatusFilter={normalizedInitialStatus}
        canCreate={canCreateCompanies}
        canEdit={canEditCompanies}
        canToggleStatus={canToggleCompanies}
        canDelete={canDeleteCompanies}
      />
    </div>
  );
}

