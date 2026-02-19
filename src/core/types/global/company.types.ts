import { CompanyStatus, TaxRegime, IndicadorIE } from "@prisma/client"

// ─── Base ─────────────────────────────────────────────────────────────────────

/**
 * Tipo base de empresa — usado em todos os componentes do módulo de cadastros.
 * Extenda esta interface ao invés de redefinir campos individualmente.
 */
export interface CompanyBase {
  id: string
  razaoSocial: string
  cnpj: string
  nomeFantasia: string | null
  status: CompanyStatus
  [key: string]: any
}

// ─── Endereço ─────────────────────────────────────────────────────────────────

export interface CompanyAddress {
  id?: string
  description: string
  cep: string
  logradouro: string
  numero: string
  complemento?: string | null
  bairro: string
  cidade: string
  estado: string
  pais: string
  codigoIbgeCidade?: string | null
  codigoIbgeEstado?: string | null
}

// ─── Variações por contexto ───────────────────────────────────────────────────

/** Empresa com endereço — usada em CompanyTab, CadastrosContainer e UserTab */
export interface CompanyWithAddress extends CompanyBase {
  address?: CompanyAddress
  addresses?: CompanyAddress[]
}

/** Empresa completa com dados fiscais — usada nos dialogs de criação/edição */
export interface CompanyWithDetails extends CompanyWithAddress {
  logoUrl?: string | null
  dataFundacao?: Date | null
  regimeTributario?: TaxRegime | null
  indicadorIE?: IndicadorIE
  inscricaoEstadual?: string | null
  inscricaoMunicipal?: string | null
  crt?: string | null
  cnae?: string | null
  codSuframa?: string | null
  emailContato?: string | null
  emailFinanceiro?: string | null
  telefone?: string | null
  website?: string | null
  observacoes?: string | null
  parentCompanyId?: string | null
  accountingFirmId?: string | null
}

/**
 * Opção simplificada para Selects e Comboboxes.
 * Usada em CreateUserDialog, EditUserDialog, UserMembershipsList.
 */
export interface CompanyOption {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj?: string
  [key: string]: any
}

/** Empresa na listagem da tabela — com contagem de membros */
export interface CompanyWithCount extends CompanyBase {
  _count?: {
    memberships: number
  }
  usersCount?: number
  addresses?: CompanyAddress[]
}
