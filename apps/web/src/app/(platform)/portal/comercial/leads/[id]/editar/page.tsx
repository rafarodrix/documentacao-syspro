import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { getCrmLeadById } from "@/features/crm/application/queries";
import { CreateLeadPageForm } from "@/features/crm/interface/CreateLeadPageForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComercialLeadEditPage({ params }: PageProps) {
  await requireRole([...SYSTEM_ROLES]);

  const { id } = await params;
  const lead = await getCrmLeadById(id);

  if (!lead) {
    notFound();
  }

  return <CreateLeadPageForm mode="edit" leadId={id} initialData={lead} />;
}
