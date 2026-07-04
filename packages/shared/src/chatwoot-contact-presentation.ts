export const CHATWOOT_CONTACT_DISPLAY_SEPARATOR = " \u00b7 ";

const INVALID_DISPLAY_VALUES = new Set([
  "empresa sem nome",
  "sem empresa",
  "empresa nao vinculada",
  "contato sem nome",
  "contato nao identificado",
  "unknown",
  "undefined",
  "null",
  "-",
  "--",
]);

export function cleanChatwootDisplayName(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return INVALID_DISPLAY_VALUES.has(normalized.toLowerCase()) ? null : normalized;
}

export function buildChatwootContactDisplayName(input: {
  contactName?: string | null;
  companyName?: string | null;
}) {
  const contactName = cleanChatwootDisplayName(input.contactName);
  const companyName = cleanChatwootDisplayName(input.companyName);

  if (contactName && companyName) {
    return `${contactName}${CHATWOOT_CONTACT_DISPLAY_SEPARATOR}${companyName}`;
  }

  return contactName || companyName || "Contato sem nome";
}

export function splitChatwootContactDisplayName(value: string | null | undefined) {
  const normalized = cleanChatwootDisplayName(value);
  if (!normalized) {
    return { contactName: null, companyName: null };
  }

  const delimiters = [CHATWOOT_CONTACT_DISPLAY_SEPARATOR, " - ", " | "];
  for (const delimiter of delimiters) {
    const idx = normalized.indexOf(delimiter);
    if (idx <= 0) continue;

    const left = cleanChatwootDisplayName(normalized.slice(0, idx));
    const right = cleanChatwootDisplayName(normalized.slice(idx + delimiter.length));
    if (left && right) {
      return { contactName: left, companyName: right };
    }
  }

  return { contactName: normalized, companyName: null };
}
