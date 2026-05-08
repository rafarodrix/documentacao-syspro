import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateContactPageForm } from "@/components/platform/app/contatos/create-contact-page-form";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

export default async function NovoContatoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("contacts:create", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const companies = await getCompanyOptionsQuery();

  return <CreateContactPageForm companies={companies} backHref="/portal/contatos" />;
}
