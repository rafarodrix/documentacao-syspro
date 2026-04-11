import { requireSession } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateContactPageForm } from "@/components/platform/app/contatos/CreateContactPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function NovoContatoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const result = await getClientUsersAdminViewData();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  return <CreateContactPageForm companies={result.companies} backHref="/portal/contatos" />;
}
