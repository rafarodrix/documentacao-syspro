import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getUserEditViewData } from "@/features/user-access/application/user-access-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";

function getAllowedRolesForRequester(canManageInternal: boolean): UserRoleValue[] {
  if (!canManageInternal) return ["CLIENTE_USER", "CLIENTE_ADMIN"];
  return ["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE", "DEVELOPER", "ADMIN"];
}

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const canManageInternal = await currentUserHasPermission("users:manage_internal");
  const allowedRoles = getAllowedRolesForRequester(canManageInternal);
  if (!allowedRoles.length) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getUserEditViewData(id);
  if (!allowedRoles.includes(view.initialData.role)) return <CadastrosAccessDenied />;

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={view.companies}
      context={view.context}
      canAssignAdminRole={view.isAdmin}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
      initialData={view.initialData}
    />
  );
}
