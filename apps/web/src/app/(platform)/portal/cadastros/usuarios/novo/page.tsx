import { requireSession } from "@/lib/auth-helpers";
import { getUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";

function getAllowedRolesForRequester(role: UserRoleValue, canManageInternal: boolean): UserRoleValue[] {
  if (!canManageInternal) return ["CLIENTE_USER", "CLIENTE_ADMIN"];
  if (role === "ADMIN") return ["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE", "DEVELOPER", "ADMIN"];
  if (role === "DEVELOPER") return ["CLIENTE_USER", "CLIENTE_ADMIN", "DEVELOPER"];
  if (role === "SUPORTE") return ["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE"];
  if (role === "CLIENTE_ADMIN") return ["CLIENTE_USER", "CLIENTE_ADMIN"];
  return [];
}

export default async function CadastrosUsuariosNovoPage() {
  const session = await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const canManageInternal = await currentUserHasPermission("users:manage_internal");
  const allowedRoles = getAllowedRolesForRequester(session.role as UserRoleValue, canManageInternal);
  if (!allowedRoles.length) return <CadastrosAccessDenied />;

  const result = await getUsersAdminViewData();
  if ("error" in result) return <div>Erro: {result.error}</div>;
  const isGlobalView = await currentUserHasPermission("users:view_all");

  return (
    <CreateUserPageForm
      companies={result.companies}
      context="UNIFIED"
      isAdmin={isGlobalView || result.isGlobalView}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
    />
  );
}

