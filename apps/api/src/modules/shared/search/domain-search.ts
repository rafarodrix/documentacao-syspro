import { Prisma } from '@prisma/client';

export type PreparedSearchTerm = {
  raw: string;
  digits: string;
  hasValue: boolean;
};

export function prepareSearchTerm(query: string | null | undefined): PreparedSearchTerm {
  const raw = String(query ?? '').trim();
  return {
    raw,
    digits: raw.replace(/\D/g, ''),
    hasValue: raw.length > 0,
  };
}

export function buildCompanySearchWhere(query: string | null | undefined): Prisma.CompanyWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { razaoSocial: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { nomeFantasia: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      ...(term.digits ? [{ cnpj: { contains: term.digits } }] : []),
    ],
  };
}

export function buildContactSearchWhere(query: string | null | undefined): Prisma.CompanyContactWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { name: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { email: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { phone: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      ...(term.digits ? [{ cpf: { contains: term.digits, mode: Prisma.QueryMode.insensitive } }] : []),
      { jobTitle: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { whatsapp: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { companyLinks: { some: { company: { razaoSocial: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } } } },
      { companyLinks: { some: { company: { nomeFantasia: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } } } },
    ],
  };
}

export function buildTicketSearchWhere(query: string | null | undefined): Prisma.ConversationWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { subject: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { ticketNumber: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { companyContact: { name: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } },
      { companyContact: { email: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } },
      { company: { nomeFantasia: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } },
      { company: { razaoSocial: { contains: term.raw, mode: Prisma.QueryMode.insensitive } } },
    ],
  };
}

export function buildTicketCustomerOptionCompanySearchWhere(query: string | null | undefined): Prisma.CompanyWhereInput {
  return buildCompanySearchWhere(query);
}

export function buildTicketCustomerOptionContactSearchWhere(
  query: string | null | undefined,
): Prisma.CompanyContactWhereInput {
  const term = prepareSearchTerm(query);
  if (!term.hasValue) return {};

  return {
    OR: [
      { email: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      { name: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
      {
        companyLinks: {
          some: {
            company: {
              deletedAt: null,
              OR: [
                { nomeFantasia: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
                { razaoSocial: { contains: term.raw, mode: Prisma.QueryMode.insensitive } },
              ],
            },
          },
        },
      },
    ],
  };
}
