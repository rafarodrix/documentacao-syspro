import { Role } from "@prisma/client"

// ─── Base ─────────────────────────────────────────────────────────────────────

/**
 * Tipo base de usuário — usado em todos os componentes do módulo de cadastros.
 * Extenda esta interface ao invés de redefinir campos individualmente.
 */
export interface UserBase {
  id: string
  name: string | null
  email: string
  image: string | null
  role: Role
  isActive: boolean
  jobTitle: string | null
  cpf: string | null
  phone: string | null
  memberships: UserMembership[]
  [key: string]: any
}

// ─── Membership ───────────────────────────────────────────────────────────────

export interface UserMembership {
  companyId: string
  role: Role
  company: MembershipCompany
  [key: string]: any
}

export interface MembershipCompany {
  id: string
  razaoSocial: string
  nomeFantasia: string | null
  cnpj: string
}

// ─── Variações por contexto ───────────────────────────────────────────────────

/** Usuário com vínculos — usado em UserTab e EditUserDialog */
export interface UserWithRelations extends UserBase {
  memberships: UserMembership[]
}

/** Usuário de sistema (ADMIN, DEVELOPER, SUPORTE) — usado em SystemUserTab */
export type SystemUserWithRelations = UserWithRelations

/** Usuário cliente (CLIENTE_ADMIN, CLIENTE_USER) — usado em UserTab */
export type ClientUserWithRelations = UserWithRelations
