import { requireSession } from "@/lib/auth-helpers";
import { getCompanyEditViewData } from "@/features/company/application/company-read.queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CadastrosEmpresaEditarPage({ params, searchParams }: PageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("companies:edit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const returnToParam = query?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";
  const view = await getCompanyEditViewData(id);

  return (
    <CreateCompanyPageForm
      mode="edit"
      companyId={view.companyId}
      canEditCnpj={view.canEditCnpj}
      backHref={backHref}
      companies={view.companies}
      initialData={view.initialData}
    />
  );
}
