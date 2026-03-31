/**
 * Selects para consultas relacionadas a usuários e empresas.
 * Centraliza os campos selecionados para garantir consistência e facilitar manutenção.
 */

export const userListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  jobTitle: true,
  cpf: true,
  phone: true,
  deletedAt: true,
  createdAt: true,
  memberships: {
    select: {
      companyId: true,
      role: true,
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
        },
      },
    },
  },
} as const;

export const companyOptionSelect = {
  id: true,
  razaoSocial: true,
  nomeFantasia: true,
  cnpj: true,
  segment: true,
  status: true,
  _count: {
    select: {
      memberships: true,
    },
  },
} as const;

/**
 * Tipos inferidos — evita repetir manualmente em mappers e funções.
 */
export type UserListSelectResult = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: import("@prisma/client").Role;
  isActive: boolean;
  jobTitle: string | null;
  cpf: string | null;
  phone: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  memberships: {
    companyId: string;
    role: import("@prisma/client").Role;
    company: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    };
  }[];
};