import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-helpers";
import { getCrmLeadsData } from "@/features/crm/application/crm-read.queries";
import { LeadManagementPage } from "@/features/crm/interface/lead-management-page";
import { currentUserHasAnyPermission } from "@/features/user-access/application/current-user-access";

export default async function ComercialLeadsPage() {
  await requireSession();
  if (!(await currentUserHasAnyPermission(["crm:view", "crm:manage"], { acceptCompanyScope: true }))) {
    redirect("/portal");
  }
  const data = await getCrmLeadsData();
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <LeadManagementPage data={data} />
    </div>
  );
}
