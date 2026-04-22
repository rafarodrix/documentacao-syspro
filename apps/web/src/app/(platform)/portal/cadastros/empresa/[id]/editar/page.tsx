import { requireSession } from "@/lib/auth-helpers";
import { getCompanyEditViewData } from "@/features/company/application/queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CadastrosEmpresaEditarPage({ params }: PageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("companies:edit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const { id } = await params;
  const view = await getCompanyEditViewData(id);

  return (
    <CreateCompanyPageForm
      mode="edit"
      companyId={view.companyId}
      canEditCnpj={view.canEditCnpj}
      backHref="/portal/cadastros/empresa"
      companies={view.companies}
      initialData={view.initialData}
    />
  );
}
