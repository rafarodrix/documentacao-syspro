import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getClientUserEditViewData } from "@/features/user-access/application/queries";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosUsuariosEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[],
    CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "users:edit")) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getClientUserEditViewData(id);

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={view.companies}
      context="CLIENT"
      isAdmin={view.isAdmin}
      backHref="/app/cadastros/usuarios"
      initialData={view.initialData}
    />
  );
}
