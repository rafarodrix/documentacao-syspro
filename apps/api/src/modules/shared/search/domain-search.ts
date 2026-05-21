import { Prisma } from '@prisma/client';
import { normalizeSearchText, onlyDigits } from '@dosc-syspro/shared';

export type PreparedSearchTerm = {
  raw: string;
  digits: string;
  hasValue: boolean;
};

function searchTextContains(term: string) {
  return {
    contains: term,
    mode: Prisma.QueryMode.insensitive,
  } as Prisma.StringFilter;
}

export function prepareSearchTerm(query: string | null | undefined): PreparedSearchTerm {
  const raw = String(query ?? '').trim();
  const normalized = normalizeSearchText(raw, { preserveSeparators: false });
  return {
    raw: normalized,
    digits: onlyDigits(raw),
    hasValue: normalized.length > 0,
  };
}

export function buildCompanySearchWhere(query: string | null | undefined): Prisma.CompanyWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    searchText: searchTextContains(term.raw),
  } as Prisma.CompanyWhereInput;
}

export function buildContactSearchWhere(query: string | null | undefined): Prisma.CompanyContactWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { searchText: searchTextContains(term.raw) } as Prisma.CompanyContactWhereInput,
      {
        companyLinks: {
          some: {
            company: {
              searchText: searchTextContains(term.raw),
            } as Prisma.CompanyWhereInput,
          },
        },
      } as Prisma.CompanyContactWhereInput,
    ],
  } as Prisma.CompanyContactWhereInput;
}

export function buildTicketSearchWhere(query: string | null | undefined): Prisma.ConversationWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { searchText: searchTextContains(term.raw) } as Prisma.ConversationWhereInput,
      {
        companyContact: {
          searchText: searchTextContains(term.raw),
        } as Prisma.CompanyContactWhereInput,
      } as Prisma.ConversationWhereInput,
      {
        company: {
          searchText: searchTextContains(term.raw),
        } as Prisma.CompanyWhereInput,
      } as Prisma.ConversationWhereInput,
    ],
  } as Prisma.ConversationWhereInput;
}

export function buildTicketCustomerOptionCompanySearchWhere(query: string | null | undefined): Prisma.CompanyWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { searchText: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
      { nomeFantasia: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
      { razaoSocial: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
      ...(term.digits
        ? [{ cnpj: { contains: term.digits } } as Prisma.CompanyWhereInput]
        : []),
    ],
  } as Prisma.CompanyWhereInput;
}

export function buildTicketCustomerOptionContactSearchWhere(
  query: string | null | undefined,
): Prisma.CompanyContactWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { searchText: searchTextContains(term.raw) } as Prisma.CompanyContactWhereInput,
      { name: searchTextContains(term.raw) } as Prisma.CompanyContactWhereInput,
      { email: searchTextContains(term.raw) } as Prisma.CompanyContactWhereInput,
      {
        companyLinks: {
          some: {
            company: {
              deletedAt: null,
              OR: [
                { searchText: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
                { nomeFantasia: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
                { razaoSocial: searchTextContains(term.raw) } as Prisma.CompanyWhereInput,
                ...(term.digits
                  ? [{ cnpj: { contains: term.digits } } as Prisma.CompanyWhereInput]
                  : []),
              ],
            } as Prisma.CompanyWhereInput,
          },
        },
      } as Prisma.CompanyContactWhereInput,
    ],
  } as Prisma.CompanyContactWhereInput;
}
