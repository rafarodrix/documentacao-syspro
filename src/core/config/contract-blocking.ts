export const CONTRACT_BLOCK_MARKER = "[CONTRACT_BLOCK]";

export const CONTRACT_BLOCK_REASONS = [
  "EMPRESA_FECHOU",
  "TROCOU_SISTEMA",
  "INADIMPLENCIA",
  "OUTROS",
] as const;

export type ContractBlockReason = (typeof CONTRACT_BLOCK_REASONS)[number];

export const CONTRACT_BLOCK_REASON_LABEL: Record<ContractBlockReason, string> = {
  EMPRESA_FECHOU: "Empresa fechou",
  TROCOU_SISTEMA: "Trocou de sistema",
  INADIMPLENCIA: "Inadimplencia",
  OUTROS: "Outros",
};

export function serializeContractBlockReason(reason: ContractBlockReason, details?: string): string {
  const cleanDetails = details?.trim() ?? "";
  return `${CONTRACT_BLOCK_MARKER}${reason}|${cleanDetails}`;
}

export function parseContractBlockReason(
  notes: string | null | undefined,
): { reason: ContractBlockReason; details: string | null; label: string } | null {
  if (!notes || !notes.startsWith(CONTRACT_BLOCK_MARKER)) return null;

  const payload = notes.slice(CONTRACT_BLOCK_MARKER.length);
  const [rawReason, rawDetails = ""] = payload.split("|");
  if (!CONTRACT_BLOCK_REASONS.includes(rawReason as ContractBlockReason)) return null;

  const reason = rawReason as ContractBlockReason;
  const details = rawDetails.trim() || null;
  const label = details ? `${CONTRACT_BLOCK_REASON_LABEL[reason]}: ${details}` : CONTRACT_BLOCK_REASON_LABEL[reason];

  return { reason, details, label };
}
