import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { hasPermission } from "@/features/user-access/domain/rbac";
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
      backHref="/portal/cadastros/empresa"
      companies={view.companies}
      initialTicketEmails={view.initialTicketEmails}
      initialContacts={view.initialContacts}
      initialData={view.initialData}
    />
  );
}
