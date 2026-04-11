import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { CadastrosPageHeader } from "@/components/platform/cadastros/shared/CadastrosPageHeader";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { ContactsTab } from "@/components/platform/app/contatos/ContactsTab";

export default async function ContatosRootPage() {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.contatos.allowed] as Role[],
    CADASTROS_ROUTE_RULES.contatos.redirectIfBlocked,
  );

  // Contacts use CADASTRO_MANAGER_ROLES for all operations
  // ADMIN and DEVELOPER get full access, SUPORTE and CLIENTE_ADMIN get view+edit
  const isAdmin = session.role === Role.ADMIN || session.role === Role.DEVELOPER;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CadastrosPageHeader
        title="Contatos"
        description="Gerencie os contatos da plataforma e seus vinculos com empresas."
      />
      <ContactsTab
        canCreate={true}
        canEdit={true}
        canDelete={isAdmin}
      />
    </div>
  );
}
