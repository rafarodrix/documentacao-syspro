import type {
  CompanySegment,
  CompanyStatus,
  IndicadorIE,
  TaxRegime,
} from "@prisma/client";

export type CompanyActionResponse<T = unknown> = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: T;
};

export type CompanyZammadEmailInput = {
  email: string;
  label?: string;
  isActive?: boolean;
};

export type CompanyRegistryLookupResponse = {
  configured: boolean;
  provider: string;
  profile?: {
    cnpj: string;
    legalName: string;
    tradeName?: string;
    status?: string;
    openingDate?: string;
    primaryCnae?: string;
    primaryCnaeDescription?: string;
    email?: string;
    phone?: string;
    address?: {
      cep?: string;
      street?: string;
      number?: string;
      complement?: string;
      district?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
};

export interface CompanyOption {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
}

export interface CompanyAddressView {
  description?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  codigoIbgeCidade?: string | null;
  codigoIbgeEstado?: string | null;
}

export interface CompanyListItem {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  segment?: CompanySegment | null;
  status: CompanyStatus;
  contractBlockReasonLabel?: string | null;
  isBlockedByContract?: boolean;
  usersCount?: number;
  address?: CompanyAddressView | null;
  accountingFirm?: { id: string; nomeFantasia: string | null } | null;
  _count?: {
    memberships: number;
    contracts?: number;
    branches?: number;
    accountingClients?: number;
  };
}

export interface CompanyAdminListViewData {
  companies: CompanyListItem[];
  isGlobalView: boolean;
}

export interface CompanyEditInitialData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  segment?: CompanySegment | null;
  logoUrl: string;
  status: CompanyStatus;
  parentCompanyId: string;
  accountingFirmId: string;
  regimeTributario?: TaxRegime | null;
  indicadorIE: IndicadorIE;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnae: string;
  codSuframa: string;
  dataFundacao?: Date | undefined;
  emailContato: string;
  emailFinanceiro: string;
  telefone: string;
  whatsapp: string;
  website: string;
  observacoes: string;
  address: {
    description: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    codigoIbgeCidade: string;
    codigoIbgeEstado: string;
  };
}

export interface CompanyEditViewData {
  companyId: string;
  companies: CompanyOption[];
  canEditCnpj: boolean;
  initialData: CompanyEditInitialData;
  initialZammadEmails: CompanyZammadEmailInput[];
}

