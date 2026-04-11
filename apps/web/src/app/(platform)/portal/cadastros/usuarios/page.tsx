import { requireSession } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";
import { UserTab } from "@/features/user-access/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosPage() {
  await requireSession();
  const result = await getClientUsersAdminViewData();

  if ("error" in result) return <div>Erro: {result.error}</div>;
  if (
    !(await currentUserHasAnyPermission(["users:view", "users:view_all", "users:view_team"], {
      acceptCompanyScope: true,
    }))
  ) {
    return <CadastrosAccessDenied />;
  }

  const canManage = await currentUserHasAnyPermission(["users:create", "users:edit", "users:status"], {
    acceptCompanyScope: true,
  });

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
        canManage={canManage}
      />
    </div>
  );
}

