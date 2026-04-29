import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsAction } from "@/features/company/application/company-read.queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

interface CadastrosEmpresaNovoPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CadastrosEmpresaNovoPage({ searchParams }: CadastrosEmpresaNovoPageProps) {
  await requireSession();
  if (!(await currentUserHasPermission("companies:create"))) return <CadastrosAccessDenied />;

  const params = searchParams ? await searchParams : undefined;
  const returnToParam = params?.returnTo;
  const backHref =
    typeof returnToParam === "string"
      ? returnToParam
      : Array.isArray(returnToParam)
        ? returnToParam[0] ?? "/portal/cadastros/empresa"
        : "/portal/cadastros/empresa";

  const companies = await getCompanyOptionsAction();

  return <CreateCompanyPageForm backHref={backHref} companies={companies} />;
}
