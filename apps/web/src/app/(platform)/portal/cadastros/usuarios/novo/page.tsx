import { requireSession } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { Role } from "@prisma/client";

function getAllowedRolesForRequester(role: Role): Role[] {
  if (role === Role.ADMIN) return [Role.CLIENTE_USER, Role.CLIENTE_ADMIN, Role.SUPORTE, Role.DEVELOPER, Role.ADMIN];
  if (role === Role.DEVELOPER) return [Role.DEVELOPER];
  if (role === Role.SUPORTE) return [Role.SUPORTE];
  if (role === Role.CLIENTE_ADMIN) return [Role.CLIENTE_USER, Role.CLIENTE_ADMIN];
  return [];
}

export default async function CadastrosUsuariosNovoPage() {
  const session = await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const allowedRoles = getAllowedRolesForRequester(session.role as Role);
  if (!allowedRoles.length) return <CadastrosAccessDenied />;

  const result = await getClientUsersAdminViewData();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  return (
    <CreateUserPageForm
      companies={result.companies}
      context="UNIFIED"
      isAdmin={result.isGlobalView}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
    />
  );
}

