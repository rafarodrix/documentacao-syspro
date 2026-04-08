import { Role } from "@prisma/client";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { requireRole } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { CreateContactPageForm } from "@/components/platform/app/contatos/CreateContactPageForm";

export default async function NovoContatoPage() {
  await requireRole(
    [...CADASTROS_ROUTE_RULES.contatos.allowed] as Role[],
    CADASTROS_ROUTE_RULES.contatos.redirectIfBlocked,
  );

  const result = await getClientUsersAdminViewData();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  return <CreateContactPageForm companies={result.companies} backHref="/portal/contatos" />;
}
