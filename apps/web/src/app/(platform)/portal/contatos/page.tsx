import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { requireSession } from "@/lib/auth-helpers";
import { currentUserHasAnyPermission, currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { ContactsTab } from "@/features/contact/interface";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/cadastros-page-header";
import { trpc } from "@/lib/api/trpc-client";
import type { ContactAdminView } from "@dosc-syspro/contracts/contact";

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
  const adminView = await (trpc.contacts.getAdminView.query() as Promise<ContactAdminView>);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Central de Contatos"
        description="Gerencie pessoas, canais de contato e vinculos com empresas."
        actions={
          canCreate ? (
            <Button asChild size="sm" className="h-9 gap-2">
              <Link href="/portal/contatos/novo">
                <Plus className="h-4 w-4" />
                Novo contato
              </Link>
            </Button>
          ) : null
        }
      />
      <ContactsTab
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canSync={canSync}
      />
    </div>
  );
}
