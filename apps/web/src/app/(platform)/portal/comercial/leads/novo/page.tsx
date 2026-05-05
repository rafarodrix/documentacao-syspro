import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { CreateLeadPageForm } from "@/features/crm/interface/create-lead-page-form";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

export default async function ComercialLeadsCreatePage() {
  await requireSession();
  if (!(await currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }))) {
    redirect("/portal");
  }
  return <CreateLeadPageForm />;
}
