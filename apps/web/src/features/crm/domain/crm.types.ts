import type { CrmLead } from "@dosc-syspro/contracts/crm";
import type { PaginationMeta } from "@dosc-syspro/contracts";
import { formatCurrency } from "@/lib/formatters";

export {
  CRM_ACTIVE_STAGE_ORDER,
  CRM_CLOSED_STAGE_ORDER,
  CRM_STAGE_ORDER,
  CRM_STAGE_LABELS,
  CRM_STAGE_DESCRIPTIONS,
  CRM_SOURCE_LABELS,
  getLeadAttentionState,
  DUE_SOON_DAYS,
  STALE_LEAD_DAYS,
} from "@dosc-syspro/crm-domain";

export type LeadDashboardData = {
  leads: CrmLead[];
  pagination: PaginationMeta | null;
};

export function formatLeadCurrency(value?: number | null) {
  if (typeof value !== "number") return "Nao estimado";
  return formatCurrency(value);
}
