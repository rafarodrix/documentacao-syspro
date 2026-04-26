import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getUserEditViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import type { UserRoleValue } from "@dosc-syspro/contracts/user";

function getAllowedRolesForRequester(role: UserRoleValue): UserRoleValue[] {
  if (role === "ADMIN") return ["CLIENTE_USER", "CLIENTE_ADMIN", "SUPORTE", "DEVELOPER", "ADMIN"];
  if (role === "DEVELOPER") return ["DEVELOPER"];
  if (role === "SUPORTE") return ["SUPORTE"];
  if (role === "CLIENTE_ADMIN") return ["CLIENTE_USER", "CLIENTE_ADMIN"];
  return [];
}

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  const session = await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const allowedRoles = getAllowedRolesForRequester(session.role as UserRoleValue);
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
      isAdmin={view.isAdmin}
      allowedRoles={allowedRoles}
      backHref="/portal/cadastros/usuarios"
      initialData={view.initialData}
    />
  );
}
