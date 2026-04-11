import { Role } from "@prisma/client";
import { CADASTROS_ROUTE_RULES } from "@dosc-syspro/core";
import { requireRole } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { CreateContactPageForm } from "@/components/platform/app/contatos/CreateContactPageForm";
import { headers } from "next/headers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ContactDetail = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyIds?: string[];
  companyId?: string | null;
  companies?: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia?: string | null;
  }>;
};

async function getContactById(id: string): Promise<ContactDetail | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  const response = await fetch(`${getBackendApiBaseUrl()}/contacts/${encodeURIComponent(id)}`, {
    headers: withInternalApiHeaders({
      ...(cookie ? { cookie } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as ContactDetail;
}

export default async function EditarContatoPage({ params }: PageProps) {
  await requireRole(
    [...CADASTROS_ROUTE_RULES.contatos.allowed] as Role[],
    CADASTROS_ROUTE_RULES.contatos.redirectIfBlocked,
  );

  const { id } = await params;
  const [contact, result] = await Promise.all([
    getContactById(id),
    getClientUsersAdminViewData(),
  ]);

  if (!contact) notFound();
  if ("error" in result) return <div>Erro: {result.error}</div>;

  const companyIds =
    contact.companyIds ??
    (contact.companies?.map((c) => c.id) ?? (contact.companyId ? [contact.companyId] : []));

  return (
    <CreateContactPageForm
      mode="edit"
      contactId={contact.id}
      backHref="/portal/contatos"
      companies={result.companies}
      initialData={{
        name: contact.name ?? "",
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        whatsapp: contact.whatsapp ?? "",
        notes: contact.notes ?? "",
        companyIds,
      }}
    />
  );
}
