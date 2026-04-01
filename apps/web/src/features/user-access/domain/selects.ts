import type { UserAccessListItem, SystemUserListItem } from "@/features/user-access/domain/model";

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

// O tipo resultante do select acima, que é a base para os mappers usados nas queries.

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

// O tipo resultante do select acima, que é a base para os mappers usados nas queries.

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

// Mappers para transformar o resultado bruto do banco em formatos específicos para a UI.

export function mapClientUserListItem(user: UserListSelectResult): UserAccessListItem {
  return {
    ...user,
    companyName:
      user.memberships[0]?.company?.nomeFantasia ||
      user.memberships[0]?.company?.razaoSocial ||
      "Sem Vínculo",
    companyId: user.memberships[0]?.companyId ?? null,
  };
}

export function mapSystemUserListItem(user: UserListSelectResult): SystemUserListItem {
  return { ...user };
}