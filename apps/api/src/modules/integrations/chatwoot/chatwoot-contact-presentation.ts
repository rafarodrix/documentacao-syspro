export function buildChatwootContactDisplayName(input: {
  contactName?: string | null;
  companyName?: string | null;
}) {
  const contactName = String(input.contactName ?? "").trim();
  const companyName = String(input.companyName ?? "").trim();

  if (contactName && companyName) {
    return `${contactName} \u00b7 ${companyName}`;
  }

  return contactName || companyName || "Contato sem nome";
}
