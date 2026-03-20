import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { getCadastrosClientUsersData } from "@/actions/admin/get-cadastros-data";
import { CreateUserPageForm } from "@/components/platform/cadastros/user/CreateUserPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosNovoPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[],
    CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "users:create")) return <CadastrosAccessDenied />;

  const result = await getCadastrosClientUsersData();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  return (
    <CreateUserPageForm
      companies={result.companies}
      context="CLIENT"
      isAdmin={result.isGlobalView}
      backHref="/app/cadastros/usuarios"
    />
  );
}
