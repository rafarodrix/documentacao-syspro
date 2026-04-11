import { requireSession } from "@/lib/auth-helpers";
import { getSystemUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { SystemUserTab } from "@/features/user-access/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosSistemaPage() {
  await requireSession();
  const result = await getSystemUsersAdminViewData();

  if ("error" in result) return <div>Erro: {result.error}</div>;
  if (!(await currentUserHasPermission("system_team:view"))) return <CadastrosAccessDenied />;

  const canManage = await currentUserHasPermission("system_team:manage");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Analista de Sistemas"
        description="Equipe interna para administracao, suporte e desenvolvimento."
        isGlobalView={result.isGlobalView}
      />
      <SystemUserTab data={result.users} canManage={canManage} />
    </div>
  );
}

