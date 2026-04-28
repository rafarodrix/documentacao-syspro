export const ENTITY_INACTIVATION_MARKER = "[ENTITY_INACTIVATION]";

export const ENTITY_INACTIVATION_REASON_VALUES = [
  "EMPRESA_FECHOU",
  "TROCOU_SISTEMA",
  "INADIMPLENCIA",
  "SOLICITACAO_CLIENTE",
  "OUTROS",
] as const;

export type EntityInactivationReason = (typeof ENTITY_INACTIVATION_REASON_VALUES)[number];

export const ENTITY_INACTIVATION_REASON_LABEL: Record<EntityInactivationReason, string> = {
  EMPRESA_FECHOU: "Empresa fechou",
  TROCOU_SISTEMA: "Trocou de sistema",
  INADIMPLENCIA: "Inadimplencia",
  SOLICITACAO_CLIENTE: "Solicitacao do cliente",
  OUTROS: "Outros",
};

export type EntityInactivationTargetType = "company" | "contract" | "contact" | "user";

export type EntityInactivationMetadata = {
  reason: EntityInactivationReason;
  details?: string | null;
  sourceType: "company";
  sourceId: string;
  sourceLabel?: string | null;
  targetType?: EntityInactivationTargetType;
  recordedAt?: string;
};

function normalizePayload(payload: EntityInactivationMetadata): EntityInactivationMetadata {
  return {
    ...payload,
    details: payload.details?.trim() || null,
    sourceLabel: payload.sourceLabel?.trim() || null,
    recordedAt: payload.recordedAt?.trim() || new Date().toISOString(),
  };
}

export function serializeEntityInactivationMetadata(payload: EntityInactivationMetadata): string {
  return `${ENTITY_INACTIVATION_MARKER}${JSON.stringify(normalizePayload(payload))}`;
}

export function parseEntityInactivationMetadata(
  value: string | null | undefined,
): EntityInactivationMetadata | null {
  if (!value || !value.startsWith(ENTITY_INACTIVATION_MARKER)) return null;

  try {
    const raw = JSON.parse(value.slice(ENTITY_INACTIVATION_MARKER.length)) as Partial<EntityInactivationMetadata>;
    if (!raw || typeof raw !== "object") return null;
    if (!raw.sourceId || raw.sourceType !== "company") return null;
    if (!raw.reason || !ENTITY_INACTIVATION_REASON_VALUES.includes(raw.reason as EntityInactivationReason)) return null;

    return normalizePayload({
      reason: raw.reason as EntityInactivationReason,
      details: raw.details ?? null,
      sourceType: "company",
      sourceId: raw.sourceId,
      sourceLabel: raw.sourceLabel ?? null,
      targetType: raw.targetType,
      recordedAt: raw.recordedAt,
    });
  } catch {
    return null;
  }
}

function splitTextBlocks(value: string | null | undefined) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function appendEntityInactivationMetadata(
  value: string | null | undefined,
  payload: EntityInactivationMetadata,
): string {
  const nextMarker = serializeEntityInactivationMetadata(payload);
  const entries = splitTextBlocks(value).filter((entry) => {
    const parsed = parseEntityInactivationMetadata(entry);
    if (!parsed) return true;
    return !(parsed.sourceType === payload.sourceType && parsed.sourceId === payload.sourceId);
  });

  entries.push(nextMarker);
  return entries.join("\n");
}

export function removeEntityInactivationMetadata(
  value: string | null | undefined,
  matcher?: Partial<Pick<EntityInactivationMetadata, "sourceType" | "sourceId" | "targetType">>,
): string | null {
  const entries = splitTextBlocks(value).filter((entry) => {
    const parsed = parseEntityInactivationMetadata(entry);
    if (!parsed) return true;
    if (!matcher) return false;
    if (matcher.sourceType && parsed.sourceType !== matcher.sourceType) return true;
    if (matcher.sourceId && parsed.sourceId !== matcher.sourceId) return true;
    if (matcher.targetType && parsed.targetType !== matcher.targetType) return true;
    return false;
  });

  return entries.length ? entries.join("\n") : null;
}
