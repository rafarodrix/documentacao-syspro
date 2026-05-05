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
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">CRM Comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          Gerencie leads, acompanhe o funil e conclua oportunidades com mais clareza.
        </p>
      </div>
      <LeadManagementPage data={data} />
    </div>
  );
}
