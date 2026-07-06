import { requireSession } from "@/lib/auth-helpers";
import { getCompanyCockpitViewData } from "@/features/company/application/company-read.queries";
import { CompanyCockpitPage } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyCockpitRoute({ params, searchParams }: PageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("companies:view_cockpit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }
  const canEditCompany = await currentUserHasPermission("companies:edit", { acceptCompanyScope: true });

  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const returnToParam = query?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";

  const view = await getCompanyCockpitViewData(id);

  return (
    <CompanyCockpitPage
      view={view}
      backHref={backHref}
      canEdit={canEditCompany}
      editHref={`/portal/cadastros/empresa/${id}/editar?returnTo=${encodeURIComponent(backHref)}`}
    />
  );
}
