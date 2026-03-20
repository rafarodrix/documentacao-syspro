import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { CreateUserPageForm } from "@/components/platform/cadastros/user/CreateUserPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosSistemaNovoPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.sistema.allowed] as Role[],
    CADASTROS_ROUTE_RULES.sistema.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "system_team:manage")) return <CadastrosAccessDenied />;
  if (session.role !== Role.ADMIN) return <CadastrosAccessDenied />;

  return (
    <CreateUserPageForm
      companies={[]}
      context="SYSTEM"
      isAdmin
      backHref="/app/cadastros/sistema"
    />
  );
}
