import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getCrmLeadById } from "@/features/crm/application/queries";
import { CreateLeadPageForm } from "@/features/crm/interface/CreateLeadPageForm";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComercialLeadEditPage({ params }: PageProps) {
  await requireSession();
  if (!(await currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }))) {
    redirect("/portal");
  }

  const { id } = await params;
  const lead = await getCrmLeadById(id);

  if (!lead) {
    notFound();
  }

  return <CreateLeadPageForm mode="edit" leadId={id} initialData={lead} />;
}
