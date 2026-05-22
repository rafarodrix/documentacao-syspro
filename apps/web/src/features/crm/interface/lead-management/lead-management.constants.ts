import type { CrmLeadStage } from "@dosc-syspro/contracts/crm";
import { CRM_STAGE_LABELS } from "@/features/crm/domain/crm.types";
import type { PipelineColumnId } from "./lead-management.types";

export const DUE_SOON_DAYS = 7;
export const STALE_LEAD_DAYS = 7;

export const PIPELINE_COLUMNS: Array<{
  id: PipelineColumnId;
  label: string;
  description: string;
  stages: CrmLeadStage[];
  dropStage: CrmLeadStage;
}> = [
  { id: "LEAD", label: "Lead", description: "Entrada inicial.", stages: ["LEAD"], dropStage: "LEAD" },
  { id: "VALIDATION", label: "Validacao", description: "Comercial validando aderencia.", stages: ["MQL", "SQL"], dropStage: "SQL" },
  { id: "PROPOSAL", label: "Proposta", description: "Proposta ou demo comercial.", stages: ["PROPOSAL"], dropStage: "PROPOSAL" },
  { id: "NEGOTIATION", label: "Negociacao", description: "Ajustes finais para fechamento.", stages: ["NEGOTIATION"], dropStage: "NEGOTIATION" },
];

export const STAGE_GUIDE_ITEMS = [
  ...PIPELINE_COLUMNS.map((column) => ({
    id: column.id,
    label: column.label,
    description: column.description,
    active: true,
  })),
  { id: "WON", label: CRM_STAGE_LABELS.WON, description: "Negocio ganho e convertido em cliente.", active: false },
  { id: "LOST", label: CRM_STAGE_LABELS.LOST, description: "Oportunidade encerrada sem conversao.", active: false },
] as const;

export const STAGE_SELECT_OPTIONS: Array<{ value: CrmLeadStage; label: string }> = [
  { value: "LEAD", label: "Lead" },
  { value: "SQL", label: "Validacao" },
  { value: "PROPOSAL", label: "Proposta" },
  { value: "NEGOTIATION", label: "Negociacao" },
  { value: "WON", label: CRM_STAGE_LABELS.WON },
  { value: "LOST", label: CRM_STAGE_LABELS.LOST },
];
