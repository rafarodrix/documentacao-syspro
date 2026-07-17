import { buildPaginationMeta } from '@dosc-syspro/contracts';

export type ChatwootRemoteConnection = {
  type?: string | null;
  details?: string | null;
};

export type ChatwootCompanySummary = {
  id?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  observacoes?: string | null;
  serverType?: 'SYSPRO_SERVER' | 'IIS' | null;
  serverPort?: number | null;
  serverHost?: string | null;
  serverProtocol?: 'HTTP' | 'HTTPS' | null;
  iisIsapiPath?: string | null;
  installationDirectory?: string | null;
  remoteConnections?: ChatwootRemoteConnection[] | null;
  addresses?: Array<{ cidade?: string | null; pais?: string | null }> | null;
};

export function normalizeRemoteConnections(value: unknown): ChatwootRemoteConnection[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        type: typeof record.type === 'string' ? record.type : null,
        details: typeof record.details === 'string' ? record.details : null,
      };
    });
}

export function normalizeChatwootCompanySummary(company: unknown): ChatwootCompanySummary | null {
  if (!company || typeof company !== 'object') return null;

  const record = company as Record<string, unknown>;
  const addresses = Array.isArray(record.addresses)
    ? record.addresses
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => {
          const address = entry as Record<string, unknown>;
          return {
            cidade: typeof address.cidade === 'string' ? address.cidade : null,
            pais: typeof address.pais === 'string' ? address.pais : null,
          };
        })
    : [];

  return {
    id: typeof record.id === 'string' ? record.id : null,
    nomeFantasia: typeof record.nomeFantasia === 'string' ? record.nomeFantasia : null,
    razaoSocial: typeof record.razaoSocial === 'string' ? record.razaoSocial : null,
    cnpj: typeof record.cnpj === 'string' ? record.cnpj : null,
    observacoes: typeof record.observacoes === 'string' ? record.observacoes : null,
    serverType: record.serverType === 'SYSPRO_SERVER' || record.serverType === 'IIS' ? record.serverType : null,
    serverPort: typeof record.serverPort === 'number' ? record.serverPort : null,
    serverHost: typeof record.serverHost === 'string' ? record.serverHost : null,
    serverProtocol: record.serverProtocol === 'HTTP' || record.serverProtocol === 'HTTPS' ? record.serverProtocol : null,
    iisIsapiPath: typeof record.iisIsapiPath === 'string' ? record.iisIsapiPath : null,
    installationDirectory: typeof record.installationDirectory === 'string' ? record.installationDirectory : null,
    remoteConnections: normalizeRemoteConnections(record.remoteConnections),
    addresses,
  };
}

export function formatCompanyDisplayName(company?: { nomeFantasia?: string | null; razaoSocial?: string | null } | null) {
  return String(company?.nomeFantasia || company?.razaoSocial || '').trim();
}

export function serializeContact(contact: any) {
  const companies = (contact?.companyLinks ?? [])
    .map((link: any) => normalizeChatwootCompanySummary(link.company))
    .filter(Boolean);

  const primaryCompany = companies[0] ?? null;

  return {
    ...contact,
    companyId: primaryCompany?.id ?? null,
    company: primaryCompany,
    companyIds: companies.map((company: any) => company.id),
    companies,
  };
}

export function serializeContactListResponse(items: any[], page: number, pageSize: number, total: number) {
  return {
    items,
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}
