import type { CrmLeadManualContact } from '@dosc-syspro/contracts/crm';

type RawLeadRecord = {
  id: string;
  title: string;
  stage: string;
  source: string;
  ownerUserId?: string | null;
  ownerUser?: { name: string | null; email: string } | null;
  companyName: string;
  tradeName?: string | null;
  document?: string | null;
  contacts?: unknown;
  industry?: string | null;
  companySize?: string | null;
  city?: string | null;
  state?: string | null;
  estimatedValue?: number | { toNumber(): number } | null;
  licenseValue?: number | { toNumber(): number } | null;
  monthlyFee?: number | { toNumber(): number } | null;
  minimumWagePercentage?: number | { toNumber(): number } | null;
  expectedCloseAt?: Date | string | null;
  nextStep?: string | null;
  qualificationNotes?: string | null;
  lostReason?: string | null;
  convertedCompanyId?: string | null;
  convertedCompany?: { nomeFantasia: string | null; razaoSocial: string } | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function normalizeStr(value?: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

function toNumber(value?: number | { toNumber(): number } | null): number | null {
  if (value == null) return null;
  return typeof value === 'object' ? value.toNumber() : Number(value);
}

export function normalizeContactsArray(value: unknown): CrmLeadManualContact[] {
  let rawValue = value;
  if (typeof rawValue === 'string') {
    try {
      rawValue = JSON.parse(rawValue);
    } catch {
      return [];
    }
  }

  const entries = Array.isArray(rawValue)
    ? rawValue
    : rawValue && typeof rawValue === 'object'
      ? [rawValue]
      : [];

  return entries
    .map((contact) => {
      if (!contact || typeof contact !== 'object') return null;
      const record = contact as Record<string, unknown>;
      const name = String(record.name ?? '').trim();
      if (!name) return null;
      return {
        name,
        role: normalizeStr(record.role),
        email: normalizeStr(record.email),
        phone: normalizeStr(record.phone),
        whatsapp: normalizeStr(record.whatsapp),
        isPrimary: Boolean(record.isPrimary),
        notes: normalizeStr(record.notes),
      };
    })
    .filter(Boolean) as CrmLeadManualContact[];
}

export function leadInclude() {
  return {
    ownerUser: { select: { id: true, name: true, email: true } },
    convertedCompany: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
  };
}

export function serializeLead(lead: RawLeadRecord) {
  const contacts = normalizeContactsArray(lead.contacts);
  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;

  return {
    id: lead.id,
    title: lead.title,
    stage: lead.stage,
    source: lead.source,
    ownerUserId: lead.ownerUserId ?? null,
    ownerName: lead.ownerUser?.name || lead.ownerUser?.email || null,
    companyName: lead.companyName,
    tradeName: lead.tradeName ?? null,
    document: lead.document ?? null,
    contacts,
    primaryContactName: primaryContact?.name ?? null,
    industry: lead.industry ?? null,
    companySize: lead.companySize ?? null,
    city: lead.city ?? null,
    state: lead.state ?? null,
    estimatedValue: toNumber(lead.estimatedValue),
    licenseValue: toNumber(lead.licenseValue),
    monthlyFee: toNumber(lead.monthlyFee),
    minimumWagePercentage: toNumber(lead.minimumWagePercentage),
    expectedCloseAt: lead.expectedCloseAt ? new Date(lead.expectedCloseAt).toISOString() : null,
    nextStep: lead.nextStep ?? null,
    qualificationNotes: lead.qualificationNotes ?? null,
    lostReason: lead.lostReason ?? null,
    convertedCompanyId: lead.convertedCompanyId ?? null,
    convertedCompanyName:
      lead.convertedCompany?.nomeFantasia || lead.convertedCompany?.razaoSocial || null,
    createdAt: new Date(lead.createdAt).toISOString(),
    updatedAt: new Date(lead.updatedAt).toISOString(),
  };
}
