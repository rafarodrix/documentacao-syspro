import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Central de Contatos</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Gerencie pessoas, canais de contato e vinculos com empresas.
        </p>
      </div>
      <ContactsTab
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={false}
      />
    </div>
  );
}
