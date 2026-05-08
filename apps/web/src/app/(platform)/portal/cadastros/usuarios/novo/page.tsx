import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";

function getAllowedRolesForRequester(canManageInternal: boolean): UserRoleValue[] {
  if (!canManageInternal) return ["CLIENTE_USER", "CLIENTE_ADMIN"];
  return ["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE", "DEVELOPER", "ADMIN"];
}

export default async function CadastrosUsuariosNovoPage() {
  await requireSession();

  if (!(await currentUserHasPermission("users:create", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const canManageInternal = await currentUserHasPermission("users:manage_internal");
  const allowedRoles = getAllowedRolesForRequester(canManageInternal);
  if (!allowedRoles.length) return <CadastrosAccessDenied />;

  const companies = await getCompanyOptionsQuery();
  const isGlobalView = await currentUserHasPermission("users:view_all");

  return (
    <CreateUserPageForm
      companies={companies}
      context="UNIFIED"
      canAssignAdminRole={isGlobalView}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
    />
  );
}
