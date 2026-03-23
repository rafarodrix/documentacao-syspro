import { CompanySegment } from "@prisma/client";

export const COMPANY_SEGMENT_LABELS: Record<CompanySegment, string> = {
  AUTO_PECAS: "Auto pecas",
  COMERCIAL: "Comercial",
  FARMACIA: "Farmacia",
  PANIFICACAO: "Panificacao",
  AGRICOLA: "Agricola",
  PETSHOP: "Petshop",
  ESQUADRIAS: "Esquadrias",
  MARMORARIA: "Marmoraria",
  ASSISTENCIA: "Assistencia",
};

export type SegmentTriggerKey =
  | "TAX_RULES"
  | "DEFAULT_DOC_GROUP"
  | "DASHBOARD_WIDGETS"
  | "TICKET_CATEGORY_HINT";

const SEGMENT_TRIGGERS: Record<CompanySegment, SegmentTriggerKey[]> = {
  AUTO_PECAS: ["TAX_RULES", "DEFAULT_DOC_GROUP", "TICKET_CATEGORY_HINT"],
  COMERCIAL: ["DEFAULT_DOC_GROUP", "DASHBOARD_WIDGETS"],
  FARMACIA: ["TAX_RULES", "DEFAULT_DOC_GROUP", "DASHBOARD_WIDGETS"],
  PANIFICACAO: ["TAX_RULES", "DEFAULT_DOC_GROUP"],
  AGRICOLA: ["TAX_RULES", "DEFAULT_DOC_GROUP", "TICKET_CATEGORY_HINT"],
  PETSHOP: ["DEFAULT_DOC_GROUP", "DASHBOARD_WIDGETS"],
  ESQUADRIAS: ["DEFAULT_DOC_GROUP", "TICKET_CATEGORY_HINT"],
  MARMORARIA: ["DEFAULT_DOC_GROUP", "TICKET_CATEGORY_HINT"],
  ASSISTENCIA: ["DEFAULT_DOC_GROUP", "DASHBOARD_WIDGETS", "TICKET_CATEGORY_HINT"],
};

export function getCompanySegmentLabel(segment: CompanySegment | null | undefined): string {
  if (!segment) return "Nao definido";
  return COMPANY_SEGMENT_LABELS[segment] ?? segment;
}

export function resolveCompanySegmentTriggers(
  segment: CompanySegment | null | undefined,
): SegmentTriggerKey[] {
  if (!segment) return [];
  return SEGMENT_TRIGGERS[segment] ?? [];
}
