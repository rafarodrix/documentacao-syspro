/**
 * Tipos globais do módulo de cadastros.
 *
 * Uso:
 *   import { UserBase, CompanyBase, CompanyOption } from "@/core/types/global"
 */

export type {
  // Usuário
  UserBase,
  UserWithRelations,
  UserMembership,
  MembershipCompany,
  SystemUserWithRelations,
  ClientUserWithRelations,
} from "./user.types"

export type {
  // Empresa
  CompanyBase,
  CompanyAddress,
  CompanyWithAddress,
  CompanyWithDetails,
  CompanyOption,
  CompanyWithCount,
} from "./company.types"
