import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { getCadastrosSystemUsersData } from "@/actions/admin/get-cadastros-data";
import { SystemUserTab } from "@/components/platform/cadastros/user/SystemUserTab";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosSistemaPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.sistema.allowed] as Role[],
    CADASTROS_ROUTE_RULES.sistema.redirectIfBlocked,
  );
  const result = await getCadastrosSystemUsersData();

  if ("error" in result) return <div>Erro: {result.error}</div>;
  if (!hasPermission(session.role, "system_team:view")) return <CadastrosAccessDenied />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Analista de Sistemas"
        description="Equipe interna para administracao, suporte e desenvolvimento."
        isGlobalView={result.isGlobalView}
      />
      <SystemUserTab data={result.users} companies={[]} canManage={session.role === Role.ADMIN} />
    </div>
  );
}
