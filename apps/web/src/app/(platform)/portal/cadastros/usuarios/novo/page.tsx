import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";

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

  const companies = await getCompanyOptionsQuery();
  const isGlobalView = await currentUserHasPermission("users:view_all");

  return (
    <CreateUserPageForm
      companies={companies}
      context="UNIFIED"
      isAdmin={isGlobalView}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
    />
  );
}
