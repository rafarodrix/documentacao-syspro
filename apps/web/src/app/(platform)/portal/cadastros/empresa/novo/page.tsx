import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsAction } from "@/features/company/application/queries";
import { CreateCompanyPageForm } from "@/features/company/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export default async function CadastrosEmpresaNovoPage() {
  await requireSession();
  if (!(await currentUserHasPermission("companies:create"))) return <CadastrosAccessDenied />;

  const companies = await getCompanyOptionsAction();

  return <CreateCompanyPageForm backHref="/portal/cadastros/empresa" companies={companies} />;
}
