import { buildSearchText } from '@dosc-syspro/shared';

function cleanDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '').trim();
}

export function buildCompanySearchText(input: {
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  emailContato?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
}) {
  return buildSearchText([
    input.razaoSocial,
    input.nomeFantasia,
    cleanDigits(input.cnpj),
    input.emailContato,
    cleanDigits(input.telefone),
    cleanDigits(input.whatsapp),
  ], { preserveSeparators: false });
}

export function buildContactSearchText(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  jobTitle?: string | null;
}) {
  return buildSearchText([
    input.name,
    input.email,
    cleanDigits(input.phone),
    cleanDigits(input.whatsapp),
    cleanDigits(input.cpf),
    input.jobTitle,
  ], { preserveSeparators: false });
}

export function buildConversationSearchText(input: {
  subject?: string | null;
  ticketNumber?: string | null;
  contactNameSnapshot?: string | null;
  contactPhoneSnapshot?: string | null;
  contactWhatsappSnapshot?: string | null;
  externalThreadId?: string | null;
}) {
  return buildSearchText([
    input.subject,
    input.ticketNumber,
    input.contactNameSnapshot,
    cleanDigits(input.contactPhoneSnapshot),
    cleanDigits(input.contactWhatsappSnapshot),
    input.externalThreadId,
  ], { preserveSeparators: false });
}
