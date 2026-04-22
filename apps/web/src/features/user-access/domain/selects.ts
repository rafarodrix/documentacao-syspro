import type { UserAccessListItem, SystemUserListItem } from "@/features/user-access/domain/model";

export const userListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
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
      phone: true,
      companyLinks: {
        select: {
          companyId: true,
          isPrimary: true,
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
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
    phone?: string | null;
    companyId?: string | null;
    company?: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    } | null;
    companyLinks?: Array<{
      companyId: string;
      isPrimary: boolean;
      company: {
        id: string;
        razaoSocial: string;
        nomeFantasia: string | null;
      };
    }>;
  } | null;
};

export function mapClientUserListItem(user: UserListSelectResult): UserAccessListItem {
  const primaryContactLink = user.contact?.companyLinks?.[0] ?? null;

  return {
    ...user,
    contact: user.contact
      ? {
          id: user.contact.id,
          name: user.contact.name,
          whatsapp: user.contact.whatsapp,
          email: user.contact.email,
          phone: user.contact.phone ?? null,
          companyId: user.contact.companyId ?? primaryContactLink?.companyId ?? null,
          company: user.contact.company ?? primaryContactLink?.company ?? null,
        }
      : null,
    companyName:
      user.contact?.company?.nomeFantasia ||
      user.contact?.company?.razaoSocial ||
      primaryContactLink?.company?.nomeFantasia ||
      primaryContactLink?.company?.razaoSocial ||
      user.memberships[0]?.company?.nomeFantasia ||
      user.memberships[0]?.company?.razaoSocial ||
      "Sem Vinculo",
    companyId: user.contact?.companyId ?? primaryContactLink?.companyId ?? user.memberships[0]?.companyId ?? null,
  };
}

export function mapSystemUserListItem(user: UserListSelectResult): SystemUserListItem {
  const mapped = mapClientUserListItem(user);
  return {
    id: mapped.id,
    name: mapped.name,
    email: mapped.email,
    image: mapped.image,
    role: mapped.role,
    isActive: mapped.isActive,
    memberships: mapped.memberships,
    contact: mapped.contact,
  };
}
