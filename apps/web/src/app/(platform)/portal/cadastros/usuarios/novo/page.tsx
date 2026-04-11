import { requireSession } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosNovoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;

  const result = await getClientUsersAdminViewData();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  return (
    <CreateUserPageForm
      companies={result.companies}
      context="CLIENT"
      isAdmin={result.isGlobalView}
      backHref="/portal/cadastros/usuarios"
    />
  );
}

