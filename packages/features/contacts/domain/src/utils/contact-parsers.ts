import { normalizePhone } from '@dosc-syspro/shared';
import { ChatwootCompanySummary, formatCompanyDisplayName, normalizeChatwootCompanySummary } from './contact-serializers';
import { CompanyContactSource } from '@prisma/client';

export function parsePage(value?: string): number {
  const parsed = Number.parseInt(value || '1', 10);
  return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
}

export function parsePageSize(value?: string): number {
  const parsed = Number.parseInt(value || '50', 10);
  return Math.min(100, Math.max(1, Number.isNaN(parsed) ? 50 : parsed));
}

export function parseLegacyLimit(value?: string): number {
  const parsed = Number.parseInt(value || '50', 10);
  return Math.min(200, Math.max(1, Number.isNaN(parsed) ? 50 : parsed));
}

export function extractCompanyIds(contact: any): string[] {
  const fromLinks = Array.isArray(contact?.companyLinks)
    ? contact.companyLinks.map((link: any) => link.companyId).filter(Boolean)
    : [];

  if (fromLinks.length) return Array.from(new Set(fromLinks));
  return [];
}

export function normalizeCompanyIds(companyIds?: string[] | null): string[] {
  const values = [
    ...(Array.isArray(companyIds) ? companyIds : []),
  ]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function isInvalidIntegrationPhone(value?: string | null): boolean {
  const digits = normalizePhone(value) || null;
  if (!digits) return true;

  if (digits.startsWith('55')) {
    return digits.length !== 12 && digits.length !== 13;
  }

  if (digits.startsWith('1')) {
    return digits.length !== 11;
  }

  return digits.length < 10 || digits.length > 15;
}

export function formatChatwootPhoneNumber(value?: string | null): string | undefined {
  const digits = normalizePhone(value) || null;
  return digits ? `+${digits}` : undefined;
}

export function formatDateAttribute(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function resolveChatwootContactCompanies(
  updatedContact: {
    company?: ChatwootCompanySummary | null;
    companies?: ChatwootCompanySummary[] | null;
  },
  companyOverride?: ChatwootCompanySummary | null,
  linkCompany?: ChatwootCompanySummary | null,
) {
  const companies = [
    normalizeChatwootCompanySummary(companyOverride),
    ...(updatedContact.companies ?? []),
    normalizeChatwootCompanySummary(updatedContact.company),
    normalizeChatwootCompanySummary(linkCompany),
  ].filter(Boolean) as ChatwootCompanySummary[];

  const seen = new Set<string>();
  return companies.filter((company) => {
    const key = String(company.id ?? company.cnpj ?? formatCompanyDisplayName(company) ?? '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function shouldPermanentlyDeleteInvalidContact(contact: any): boolean {
  const source = String(contact?.source ?? '').toUpperCase();
  if (source !== CompanyContactSource.WHATSAPP) return false;

  const hasCompanyLinks = Array.isArray(contact?.companyLinks) && contact.companyLinks.length > 0;
  if (hasCompanyLinks) return false;

  const count = contact?._count ?? {};
  const hasPortalHistory =
    Number(count.conversations ?? 0) > 0 ||
    Number(count.authoredConversationMessages ?? 0) > 0 ||
    Number(count.userLinks ?? 0) > 0 ||
    Number(count.users ?? 0) > 0;
  if (hasPortalHistory) return false;

  return isInvalidIntegrationPhone(contact?.whatsapp ?? contact?.phone);
}
