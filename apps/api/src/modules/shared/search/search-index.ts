import { buildSearchText, onlyDigits } from '@dosc-syspro/shared';

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
    onlyDigits(input.cnpj),
    input.emailContato,
    onlyDigits(input.telefone),
    onlyDigits(input.whatsapp),
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
    onlyDigits(input.phone),
    onlyDigits(input.whatsapp),
    onlyDigits(input.cpf),
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
    onlyDigits(input.contactPhoneSnapshot),
    onlyDigits(input.contactWhatsappSnapshot),
    input.externalThreadId,
  ], { preserveSeparators: false });
}
