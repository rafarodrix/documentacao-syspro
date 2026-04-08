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
  contact: {
    select: {
      id: true,
      name: true,
      whatsapp: true,
      email: true,
      companyId: true,
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
  contact: {
    id: string;
    name: string;
    whatsapp: string | null;
    email: string | null;
    companyId: string | null;
    company: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    } | null;
  } | null;
};

export function mapClientUserListItem(user: UserListSelectResult): UserAccessListItem {
  return {
    ...user,
    companyName:
      user.contact?.company?.nomeFantasia ||
      user.contact?.company?.razaoSocial ||
      user.memberships[0]?.company?.nomeFantasia ||
      user.memberships[0]?.company?.razaoSocial ||
      "Sem Vinculo",
    companyId: user.contact?.companyId ?? user.memberships[0]?.companyId ?? null,
  };
}

export function mapSystemUserListItem(user: UserListSelectResult): SystemUserListItem {
  return { ...user };
}
