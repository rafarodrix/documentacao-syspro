import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { getCompanyEditViewData } from "@/features/company/application/queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CadastrosEmpresaEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.empresa.allowed] as Role[],
    CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "companies:edit")) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getCompanyEditViewData(id);

  return (
    <CreateCompanyPageForm
      mode="edit"
      companyId={view.companyId}
      canEditCnpj={view.canEditCnpj}
      backHref="/app/cadastros/empresa"
      companies={view.companies}
      initialZammadEmails={view.initialZammadEmails}
      initialData={view.initialData}
    />
  );
}
