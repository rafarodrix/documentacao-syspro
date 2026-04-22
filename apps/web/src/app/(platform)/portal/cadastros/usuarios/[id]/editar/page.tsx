import { requireSession } from "@/lib/auth-helpers";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getUserEditViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { Role } from "@prisma/client";

function getAllowedRolesForRequester(role: Role): Role[] {
  if (role === Role.ADMIN) return [Role.CLIENTE_USER, Role.CLIENTE_ADMIN, Role.SUPORTE, Role.DEVELOPER, Role.ADMIN];
  if (role === Role.DEVELOPER) return [Role.DEVELOPER];
  if (role === Role.SUPORTE) return [Role.SUPORTE];
  if (role === Role.CLIENTE_ADMIN) return [Role.CLIENTE_USER, Role.CLIENTE_ADMIN];
  return [];
}

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  const session = await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) return <CadastrosAccessDenied />;
  const allowedRoles = getAllowedRolesForRequester(session.role as Role);
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
