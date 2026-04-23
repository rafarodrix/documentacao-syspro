import { requireRole } from "@/lib/auth-helpers";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import { CreateLeadPageForm } from "@/features/crm/interface/CreateLeadPageForm";

export default async function ComercialLeadsCreatePage() {
  await requireRole([...SYSTEM_ROLES]);
  return <CreateLeadPageForm />;
}
