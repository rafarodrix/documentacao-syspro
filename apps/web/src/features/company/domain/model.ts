import type {
  CompanyOption,
  CompanySegmentValue,
  CompanyStatusValue,
  CreateCompanyInput,
  IndicadorIEValue,
  TaxRegimeValue,
} from "@dosc-syspro/contracts/company";
export type { CompanyOption } from "@dosc-syspro/contracts/company";

export type CompanyValidationErrors = Partial<Record<keyof CreateCompanyInput, string[]>>;

export type CompanyActionSuccess<T = void> = T extends void
  ? { success: true; message?: string }
  : { success: true; message?: string; data: T };

export type CompanyActionFailure<T = void> = {
  success: false;
  message: string;
  errors?: CompanyValidationErrors;
} & (T extends void ? {} : { data?: T });

export type CompanyActionResponse<T = void> = CompanyActionSuccess<T> | CompanyActionFailure<T>;

export type CompanyRemoteConnectionInput = {
  type: "DDNS_NOIP" | "RADMIN_VPN";
  details: string;
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
    legalNature?: string;
    size?: string;
    branchType?: string;
    taxRegistrationStatus?: string;
    secondaryCnaes?: Array<{
      code: string;
      description: string;
    }>;
    partners?: Array<{
      name: string;
      qualification?: string;
      entryDate?: string;
    }>;
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
  segment?: CompanySegmentValue | null;
  status: CompanyStatusValue;
  serverType?: "SYSPRO_SERVER" | "IIS" | null;
  serverPort?: number | null;
  serverHost?: string | null;
  serverProtocol?: "HTTP" | "HTTPS" | null;
  contractBlockReasonLabel?: string | null;
  isBlockedByContract?: boolean;
  usersCount?: number;
  contactsCount?: number;
  address?: CompanyAddressView | null;
  accountingFirm?: { id: string; nomeFantasia: string | null } | null;
  _count?: {
    memberships: number;
    contactLinks?: number;
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
  segment?: CompanySegmentValue | null;
  logoUrl: string;
  status: CompanyStatusValue;
  serverType: "SYSPRO_SERVER" | "IIS";
  serverPort: number;
  serverHost: string;
  serverProtocol: "HTTP" | "HTTPS";
  iisIsapiPath: string;
  installationDirectory: string;
  remoteConnections: CompanyRemoteConnectionInput[];
  parentCompanyId: string;
  accountingFirmId: string;
  regimeTributario?: TaxRegimeValue | null;
  indicadorIE: IndicadorIEValue;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  cnae: string;
  cnaeDescricao: string;
  cnaesSecundarios: Array<{
    code: string;
    description: string;
  }>;
  codSuframa: string;
  dataFundacao?: Date | undefined;
  naturezaJuridica: string;
  porte: string;
  matrizFilial: string;
  situacaoCadastral: string;
  qsa: Array<{
    name: string;
    qualification: string | undefined;
    entryDate: string | undefined;
  }>;
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
}
