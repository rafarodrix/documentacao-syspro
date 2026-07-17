import fs from 'fs';

const filePath = 'apps/api/src/modules/contacts/contacts.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const importStatement = "import { serializeContact, serializeContactListResponse, parsePage, parsePageSize, parseLegacyLimit, extractCompanyIds, normalizeCompanyIds, isInvalidIntegrationPhone, formatChatwootPhoneNumber, formatDateAttribute, normalizeRemoteConnections, normalizeChatwootCompanySummary, formatCompanyDisplayName, resolveChatwootContactCompanies, shouldPermanentlyDeleteInvalidContact } from '@dosc-syspro/contacts-domain';\\n";

if (!content.includes('@dosc-syspro/contacts-domain')) {
  content = content.replace(/(import .*;\\n)+/, (match) => match + importStatement);
}

const methods = [
  'serializeContact',
  'serializeContactListResponse',
  'parsePage',
  'parsePageSize',
  'parseLegacyLimit',
  'extractCompanyIds',
  'normalizeCompanyIds',
  'isInvalidIntegrationPhone',
  'formatChatwootPhoneNumber',
  'formatDateAttribute',
  'normalizeRemoteConnections',
  'normalizeChatwootCompanySummary',
  'formatCompanyDisplayName',
  'resolveChatwootContactCompanies',
  'shouldPermanentlyDeleteInvalidContact'
];

for (const method of methods) {
  content = content.split("this." + method + "(").join(method + "(");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("OK");
