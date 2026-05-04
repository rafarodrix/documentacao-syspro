import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { ContactsTab } from "@/components/platform/app/contatos/contacts-tab";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

export default async function ContatosRootPage() {
  await requireSession();

  const canView = await currentUserHasAnyPermission(["contacts:view", "contacts:view_all", "contacts:view_team"], {
    acceptCompanyScope: true,
  });
  if (!canView) return <CadastrosAccessDenied />;

  const canCreate = await currentUserHasPermission("contacts:create", { acceptCompanyScope: true });
  const canEdit = await currentUserHasPermission("contacts:edit", { acceptCompanyScope: true });
  const canDelete = await currentUserHasPermission("contacts:delete", { acceptCompanyScope: true });
  const canSync = await currentUserHasPermission("contacts:sync");

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
        canDelete={canDelete}
        canSync={canSync}
      />
    </div>
  );
}
