import { requireSession } from "@/lib/auth-helpers";
import { getCompanyOptionsQuery } from "@/features/company/application/company-read.queries";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { CreateContactPageForm } from "@/features/contact/interface";
import { trpc } from "@/lib/api/trpc-client";
import { notFound } from "next/navigation";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/cadastros-access-denied";

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
  try {
    return await trpc.contacts.getOne.query({ id }) as ContactDetail;
  } catch {
    return null;
  }
}

export default async function EditarContatoPage({ params }: PageProps) {
  await requireSession();

  if (!(await currentUserHasPermission("contacts:edit", { acceptCompanyScope: true }))) {
    return <CadastrosAccessDenied />;
  }

  const { id } = await params;
  const [contact, result] = await Promise.all([
    getContactById(id),
    getCompanyOptionsQuery(),
  ]);

  if (!contact) notFound();

  const companyIds =
    contact.companyIds ??
    (contact.companies?.map((c) => c.id) ?? (contact.companyId ? [contact.companyId] : []));

  return (
    <CreateContactPageForm
      mode="edit"
      contactId={contact.id}
      backHref="/portal/contatos"
      companies={result}
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
