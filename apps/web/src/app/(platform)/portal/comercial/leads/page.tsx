import { requireRole } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { getCrmLeadsData } from "@/features/crm/application/queries";
import { LeadManagementPage } from "@/features/crm/interface/LeadManagementPage";

export default async function ComercialLeadsPage() {
  await requireRole([...SYSTEM_ROLES]);
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
