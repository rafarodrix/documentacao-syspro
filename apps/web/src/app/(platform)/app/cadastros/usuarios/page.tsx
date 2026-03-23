import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { UserTab } from "@/features/user-access/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.usuarios.allowed] as Role[],
    CADASTROS_ROUTE_RULES.usuarios.redirectIfBlocked,
  );
  const result = await getClientUsersAdminViewData();

  if ("error" in result) return <div>Erro: {result.error}</div>;
  if (!hasPermission(session.role, "users:view")) return <CadastrosAccessDenied />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Cadastro de Usuario"
        description="Cadastre e gerencie usuarios vinculados as empresas."
        isGlobalView={result.isGlobalView}
      />
      <UserTab
        data={result.users}
        isAdmin={result.isGlobalView}
        canManage={
          hasPermission(session.role, "users:create") ||
          hasPermission(session.role, "users:edit") ||
          hasPermission(session.role, "users:status")
        }
      />
    </div>
  );
}

