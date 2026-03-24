import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { hasPermission } from "@/features/user-access/domain/rbac";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { getSystemUserEditViewData } from "@/features/user-access/application/queries";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};
export default async function CadastrosSistemaEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.sistema.allowed] as Role[],
    CADASTROS_ROUTE_RULES.sistema.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "system_team:manage")) return <CadastrosAccessDenied />;
  if (session.role !== Role.ADMIN) return <CadastrosAccessDenied />;

  const { id } = await params;
  const view = await getSystemUserEditViewData(id);

  return (
    <CreateUserPageForm
      mode="edit"
      userId={view.userId}
      companies={[]}
      context="SYSTEM"
      isAdmin
      backHref="/portal/cadastros/sistema"
      initialData={view.initialData}
    />
  );
}
