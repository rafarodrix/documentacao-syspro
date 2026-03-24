import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { hasPermission } from "@/features/user-access/domain/rbac";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { CreateUserPageForm } from "@/features/user-access/interface";
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
      backHref="/portal/cadastros/sistema"
    />
  );
}
