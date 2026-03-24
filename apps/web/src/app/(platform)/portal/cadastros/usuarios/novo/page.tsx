import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { hasPermission } from "@/features/user-access/domain/rbac";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { CreateUserPageForm } from "@/features/user-access/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosNovoPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[],
    CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "users:create")) return <CadastrosAccessDenied />;

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

