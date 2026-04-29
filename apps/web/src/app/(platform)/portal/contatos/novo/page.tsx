import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsAction } from "@/features/company/application/company-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateContactPageForm } from "@/components/platform/app/contatos/CreateContactPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function NovoContatoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("contacts:create", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const companies = await getCompanyOptionsAction();

  return <CreateContactPageForm companies={companies} backHref="/portal/contatos" />;
}
