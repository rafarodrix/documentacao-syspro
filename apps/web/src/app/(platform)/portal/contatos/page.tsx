import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { ContactsTab } from "@/components/platform/app/contatos/ContactsTab";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

export default async function ContatosRootPage() {
  await requireSession();

  const canView = await currentUserHasAnyPermission(["users:view", "users:view_all", "users:view_team"], {
    acceptCompanyScope: true,
  });
  if (!canView) return <CadastrosAccessDenied />;

  const canCreate = await currentUserHasPermission("users:create", { acceptCompanyScope: true });
  const canEdit = await currentUserHasPermission("users:edit", { acceptCompanyScope: true });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Contatos"
        description="Gerencie os contatos da plataforma e seus vinculos com empresas."
      />
      <ContactsTab
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={false}
      />
    </div>
  );
}
