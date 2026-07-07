import { requireSession } from "@/lib/auth-helpers";
import { getCompanyCockpitViewData } from "@/features/company/application/company-read.queries";
import { CompanyCockpitPage } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { currentUserCanAccessCompany } from "@/features/user-access/application/current-user-access";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyCockpitRoute({ params, searchParams }: PageProps) {
  await requireSession();
  const { id } = await params;
  if (!(await currentUserCanAccessCompany(id, "companies:view_cockpit", "companies:view_all"))) {
    return <CadastrosAccessDenied />;
  }
  const canEditCompany = await currentUserCanAccessCompany(id, "companies:edit", "companies:view_all");
  const query = searchParams ? await searchParams : undefined;
  const returnToParam = query?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";

  const view = await getCompanyCockpitViewData(id).catch((error) => {
    console.error("[company-360] Falha ao carregar cockpit.", { companyId: id, error });
    throw error;
  });

  return (
    <CompanyCockpitPage
      view={view}
      backHref={backHref}
      canEdit={canEditCompany}
      editHref={`/portal/cadastros/empresa/${id}/editar?returnTo=${encodeURIComponent(backHref)}`}
    />
  );
}
