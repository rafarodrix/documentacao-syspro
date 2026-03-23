import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type {
  ClientUserEditViewData,
  SystemUserListItem,
  SystemUserEditViewData,
  UserAccessCompanyOption,
  UserAccessListItem,
} from "@/features/user-access/domain/model";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

type ActionError = { error: string };
type SessionContext = { session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>; isSystemRole: boolean };

const companyOptionSelect = {
  id: true,
  razaoSocial: true,
  nomeFantasia: true,
  cnpj: true,
  segment: true,
  status: true,
  _count: { select: { memberships: true } },
} as const;

const userListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  jobTitle: true,
  cpf: true,
  phone: true,
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

async function getSessionContext(): Promise<SessionContext | ActionError> {
  const session = await getProtectedSession();
  if (!session) return { error: "Nao autorizado" };
  return { session, isSystemRole: SYSTEM_ROLES.includes(session.role) };
}

async function getScopedCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

function hasError(value: unknown): value is ActionError {
  return Boolean(value && typeof value === "object" && "error" in (value as Record<string, unknown>));
}

function mapClientUserListItem(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  jobTitle: string | null;
  cpf: string | null;
  phone: string | null;
  memberships: {
    companyId: string;
    role: Role;
    company: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    };
  }[];
}): UserAccessListItem {
  return {
    ...user,
    companyName: user.memberships[0]?.company?.nomeFantasia || user.memberships[0]?.company?.razaoSocial || "Sem Vinculo",
    companyId: user.memberships[0]?.companyId || null,
  };
}

function mapSystemUserListItem(user: {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  isActive: boolean;
  jobTitle: string | null;
  cpf: string | null;
  phone: string | null;
  memberships: {
    companyId: string;
    role: Role;
    company: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    };
  }[];
}): SystemUserListItem {
  return {
    ...user,
  };
}

export async function getClientUsersAdminViewData() {
  const ctx = await getSessionContext();
  if (hasError(ctx)) return ctx;

  try {
    if (ctx.isSystemRole) {
      const [companies, users] = await Promise.all([
        prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { razaoSocial: "asc" },
          select: companyOptionSelect,
        }),
        prisma.user.findMany({
          where: { deletedAt: null, role: { in: CLIENT_ROLES } },
          orderBy: { name: "asc" },
          select: userListSelect,
        }),
      ]);

      return { companies, users: users.map(mapClientUserListItem), isGlobalView: true };
    }

    const companyIds = await getScopedCompanyIds(ctx.session.userId);
    if (!companyIds.length) return { companies: [], users: [] as UserAccessListItem[], isGlobalView: false };

    const [companies, users] = await Promise.all([
      prisma.company.findMany({
        where: { id: { in: companyIds }, deletedAt: null },
        orderBy: { razaoSocial: "asc" },
        select: companyOptionSelect,
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          role: { in: CLIENT_ROLES },
          memberships: { some: { companyId: { in: companyIds } } },
        },
        select: {
          ...userListSelect,
          memberships: {
            where: { companyId: { in: companyIds } },
            select: userListSelect.memberships.select,
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return { companies, users: users.map(mapClientUserListItem), isGlobalView: false };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao buscar usuarios." };
  }
}

export async function getSystemUsersAdminViewData() {
  const ctx = await getSessionContext();
  if (hasError(ctx)) return ctx;

  try {
    if (!ctx.isSystemRole) {
      return { users: [] as SystemUserListItem[], isGlobalView: false };
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null, role: { in: SYSTEM_ROLES } },
      orderBy: { name: "asc" },
      select: userListSelect,
    });

    return { users: users.map(mapSystemUserListItem), isGlobalView: true };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao buscar equipe interna." };
  }
}

export async function getClientUserEditViewData(userId: string): Promise<ClientUserEditViewData> {
  const session = await getProtectedSession();
  if (!session) notFound();

  const managedCompanyIds =
    session.role === Role.CLIENTE_ADMIN
      ? (
          await prisma.membership.findMany({
            where: { userId: session.userId },
            select: { companyId: true },
          })
        ).map((m) => m.companyId)
      : null;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      role: { in: CLIENT_ROLES },
      ...(session.role === Role.CLIENTE_ADMIN
        ? { memberships: { some: { companyId: { in: managedCompanyIds?.length ? managedCompanyIds : ["__none__"] } } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      cpf: true,
      memberships: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!user) notFound();

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(session.role === Role.CLIENTE_ADMIN ? { id: { in: managedCompanyIds?.length ? managedCompanyIds : ["__none__"] } } : {}),
    },
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
    },
  });

  return {
    userId: user.id,
    companies: companies as UserAccessCompanyOption[],
    isAdmin: session.role !== Role.CLIENTE_ADMIN,
    initialData: {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      companyId: user.memberships[0]?.companyId ?? "",
      additionalCompanyIds: user.memberships.slice(1).map((membership) => membership.companyId),
      jobTitle: user.jobTitle ?? "",
      phone: user.phone ?? "",
      cpf: user.cpf ?? "",
      password: "",
    },
  };
}

export async function getSystemUserEditViewData(userId: string): Promise<SystemUserEditViewData> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
      role: { in: SYSTEM_ROLES },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobTitle: true,
      phone: true,
      cpf: true,
    },
  });

  if (!user) notFound();

  return {
    userId: user.id,
    initialData: {
      name: user.name ?? "",
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle ?? "",
      phone: user.phone ?? "",
      cpf: user.cpf ?? "",
      password: "",
    },
  };
}
