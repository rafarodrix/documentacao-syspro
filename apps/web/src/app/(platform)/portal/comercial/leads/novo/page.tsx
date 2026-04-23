import { requireRole } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { getCrmLeadCreateData } from "@/features/crm/application/queries";
import { CreateLeadPageForm } from "@/features/crm/interface/CreateLeadPageForm";

export default async function ComercialLeadsCreatePage() {
  await requireRole([...SYSTEM_ROLES]);
  const data = await getCrmLeadCreateData();
  return <CreateLeadPageForm contacts={data.contacts} />;
}
