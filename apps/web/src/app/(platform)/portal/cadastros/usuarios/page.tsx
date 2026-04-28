import { requireSession } from "@/lib/auth-helpers";
import { getUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { UserTab } from "@/features/user-access/interface";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function CadastrosUsuariosPage() {
  await requireSession();
  const result = await getUsersAdminViewData();

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
  const isGlobalView = await currentUserHasPermission("users:view_all");
  const canViewInternal = await currentUserHasPermission("users:view_internal");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Usuarios"
        description="Cadastre e gerencie usuarios da plataforma e da equipe interna em uma unica tela."
        isGlobalView={isGlobalView || result.isGlobalView}
      />
      <UserTab
        data={result.users}
        isAdmin={isGlobalView || result.isGlobalView}
        canManage={canManage}
        canViewInternal={canViewInternal}
      />
    </div>
  );
}

