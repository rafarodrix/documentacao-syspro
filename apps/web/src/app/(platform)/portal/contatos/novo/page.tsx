import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { ContactPageIntro, CreateContactPageForm } from "@/features/contact/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

export default async function NovoContatoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("contacts:create", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const companies = await getCompanyOptionsQuery();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ContactPageIntro mode="create" companyCount={companies.length} />
      <CreateContactPageForm companies={companies} backHref="/portal/contatos" />
    </div>
  );
}
