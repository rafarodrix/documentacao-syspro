import { requireSession } from "@/lib/auth-helpers";
import { getClientUsersAdminViewData } from "@/features/user-access/application/queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateContactPageForm } from "@/components/platform/app/contatos/CreateContactPageForm";
import { headers } from "next/headers";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import { notFound } from "next/navigation";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ContactDetail = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  jobTitle?: string | null;
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
  await requireSession();

  if (!(await currentUserHasPermission("users:edit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

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
        cpf: contact.cpf ?? "",
        jobTitle: contact.jobTitle ?? "",
        whatsapp: contact.whatsapp ?? "",
        notes: contact.notes ?? "",
        companyIds,
      }}
    />
  );
}
