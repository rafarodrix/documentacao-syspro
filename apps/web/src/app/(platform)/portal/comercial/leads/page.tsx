import { requireRole } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { getCrmLeadsData } from "@/features/crm/application/queries";
import { LeadManagementPage } from "@/features/crm/interface/LeadManagementPage";

export default async function ComercialLeadsPage() {
  await requireRole([...SYSTEM_ROLES]);
  const data = await getCrmLeadsData();
  return <LeadManagementPage data={data} />;
}
