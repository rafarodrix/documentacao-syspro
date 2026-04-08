import { Injectable, ConflictException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import type { IncomingHttpHeaders } from 'node:http';

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

type CreateUserInput = {
  email: string;
  name: string;
  password?: string;
  role?: Role;
  companyId?: string;
  additionalCompanyIds?: string[];
  primaryContactId?: string;
  cpf?: string;
  jobTitle?: string;
  phone?: string;
};

type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: Role;
  companyId?: string;
  additionalCompanyIds?: string[];
  primaryContactId?: string | null;
  isActive?: boolean;
  cpf?: string;
  jobTitle?: string;
  phone?: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(filters?: { search?: string; role?: string }, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);

    const where: Prisma.UserWhereInput = { deletedAt: null };
    const isSystemRole = this.isSystemRole(requester.role);

    if (!isSystemRole) {
      if (requester.role !== Role.CLIENTE_ADMIN) {
        throw new ForbiddenException('Acesso negado.');
      }

      const companyIds = await this.getManagedCompanyIds(requester.userId);
      if (!companyIds.length) return [];

      where.role = { in: CLIENT_ROLES };
      where.memberships = { some: { companyId: { in: companyIds } } };
    }

    if (filters?.search) {
      const searchRaw = filters.search.replace(/\D/g, '');
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        ...(searchRaw ? [{ cpf: { contains: searchRaw } }] : []),
      ];
    }

    if (filters?.role && filters.role !== 'ALL' && isSystemRole) {
      where.role = filters.role as Role;
    }

    return this.prisma.user.findMany({
      where,
      include: {
        memberships: {
          include: { company: true },
        },
        contactLinks: {
          where: { isPrimary: true },
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                whatsapp: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);

    if (!this.isSystemRole(requester.role) && requester.role === Role.CLIENTE_ADMIN) {
      await this.assertClientManagerCanManageTarget(requester.userId, id);
    }

    if (!this.isSystemRole(requester.role) && requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { memberships: { include: { company: true } } },
    });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    return user;
  }

  async create(data: CreateUserInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const isSystemRole = this.isSystemRole(requester.role);
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!isSystemRole && !isClientManager) {
      throw new ForbiddenException('Acesso negado.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictException('Este email ja esta em uso.');
    }

    const desiredCompanyIds = Array.from(new Set([data.companyId, ...(data.additionalCompanyIds || [])].filter(Boolean) as string[]));
    const normalizedPrimaryContactId = this.normalizeContactId(data.primaryContactId);

    if (isClientManager) {
      const managedCompanyIds = await this.getManagedCompanyIds(requester.userId);
      if (!data.companyId || !managedCompanyIds.includes(data.companyId)) {
        throw new ForbiddenException('Empresa invalida para este gestor.');
      }
      if (desiredCompanyIds.some((companyId) => !managedCompanyIds.includes(companyId))) {
        throw new ForbiddenException('Uma ou mais empresas informadas sao invalidas para este gestor.');
      }
      if (data.role && !CLIENT_ROLES.includes(data.role)) {
        throw new ForbiddenException('Gestor pode cadastrar apenas usuarios da unidade.');
      }
    }

    let authResult;
    try {
      authResult = await this.authService.auth.api.createUser({
        headers: new Headers(),
        body: {
          email: data.email,
          name: data.name || 'Sem nome',
          password: data.password || Math.random().toString(36).slice(-10),
          role: 'user',
        },
      });
    } catch (error: any) {
      throw new ConflictException(error?.message || 'Falha ao criar usuario na autenticacao segura.');
    }

    if (!authResult?.user) throw new Error('Falha critica ao obter o ID do novo usuario.');
    const createdUserId = authResult.user.id;

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: createdUserId },
        data: {
          name: data.name || null,
          role: data.role || Role.CLIENTE_USER,
          cpf: data.cpf || null,
          jobTitle: data.jobTitle || null,
          phone: data.phone || null,
          isActive: true,
          emailVerified: true,
        },
      });

      if (desiredCompanyIds.length > 0) {
        const membershipRole = data.role === Role.CLIENTE_ADMIN ? Role.CLIENTE_ADMIN : Role.CLIENTE_USER;
        await tx.membership.createMany({
          data: desiredCompanyIds.map((companyId) => ({
            userId: createdUserId,
            companyId,
            role: membershipRole,
          })),
          skipDuplicates: true,
        });
      }

      if (data.companyId) {
        await this.syncPrimaryContactLink(tx, createdUserId, data.companyId, normalizedPrimaryContactId);
      }

      return tx.user.findUnique({
        where: { id: createdUserId },
        include: { memberships: { include: { company: true } } },
      });
    });
  }

  async update(id: string, data: UpdateUserInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const isSystemRole = this.isSystemRole(requester.role);
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!isSystemRole && !isClientManager) throw new ForbiddenException('Acesso negado.');

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');

    let managedCompanyIds: string[] = [];
    if (isClientManager) {
      await this.assertClientManagerCanManageTarget(requester.userId, id);

      if (data.role && !CLIENT_ROLES.includes(data.role)) {
        throw new ForbiddenException('Gestor nao pode atribuir perfil interno.');
      }

      managedCompanyIds = await this.getManagedCompanyIds(requester.userId);
    }

    const desiredCompanyIds = data.companyId
      ? Array.from(new Set([data.companyId, ...(data.additionalCompanyIds || [])].filter(Boolean)))
      : null;

    if (isClientManager && desiredCompanyIds?.some((companyId) => !managedCompanyIds.includes(companyId))) {
      throw new ForbiddenException('Uma ou mais empresas informadas sao invalidas para este gestor.');
    }

    const normalizedPrimaryContactId = this.normalizeContactId(data.primaryContactId);

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          name: this.resolveUserName(data.name),
          email: data.email,
          role: data.role,
          isActive: data.isActive,
          cpf: data.cpf,
          jobTitle: data.jobTitle,
          phone: data.phone,
        },
      });

      if (desiredCompanyIds) {
        const membershipRole = data.role === Role.CLIENTE_ADMIN ? Role.CLIENTE_ADMIN : Role.CLIENTE_USER;

        if (isClientManager) {
          await tx.membership.deleteMany({
            where: { userId: id, companyId: { in: managedCompanyIds, notIn: desiredCompanyIds } },
          });
        } else {
          await tx.membership.deleteMany({
            where: { userId: id, companyId: { notIn: desiredCompanyIds } },
          });
        }

        await Promise.all(
          desiredCompanyIds.map((companyId) =>
            tx.membership.upsert({
              where: { userId_companyId: { userId: id, companyId } },
              create: { userId: id, companyId, role: membershipRole },
              update: { role: membershipRole },
            }),
          ),
        );
      }

      if (desiredCompanyIds) {
        if (isClientManager) {
          await tx.userContactLink.deleteMany({
            where: { userId: id, companyId: { in: managedCompanyIds, notIn: desiredCompanyIds } },
          });
        } else {
          await tx.userContactLink.deleteMany({
            where: { userId: id, companyId: { notIn: desiredCompanyIds } },
          });
        }
      }

      if (data.companyId) {
        await this.syncPrimaryContactLink(tx, id, data.companyId, normalizedPrimaryContactId);
      }

      return updatedUser;
    });
  }

  async linkToCompany(userId: string, companyId: string, role: Role, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    await this.assertCanManageMembershipChange(requester, userId, companyId, role);

    return this.prisma.membership.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: { userId, companyId, role },
      update: { role },
    });
  }

  async removeFromCompany(userId: string, companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    await this.assertCanManageMembershipChange(requester, userId, companyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.userContactLink.deleteMany({
        where: { userId, companyId },
      });

      return tx.membership.delete({
        where: { userId_companyId: { userId, companyId } },
      });
    });
  }

  async updateMembershipRole(userId: string, companyId: string, role: Role, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    await this.assertCanManageMembershipChange(requester, userId, companyId, role);

    return this.prisma.membership.update({
      where: { userId_companyId: { userId, companyId } },
      data: { role },
    });
  }

  async remove(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    if (requester.userId === id) throw new ForbiddenException('Operacao invalida.');

    if (!this.isSystemRole(requester.role)) {
      if (requester.role !== Role.CLIENTE_ADMIN) throw new ForbiddenException('Acesso negado.');
      await this.assertClientManagerCanManageTarget(requester.userId, id);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async getClientAdminView(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const isSystemRole = this.isSystemRole(requester.role);

    if (!isSystemRole && requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    if (isSystemRole) {
      const [companies, users] = await Promise.all([
        this.prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { razaoSocial: 'asc' },
          select: { id: true, razaoSocial: true, nomeFantasia: true },
        }),
        this.prisma.user.findMany({
          where: { deletedAt: null, role: { in: CLIENT_ROLES } },
          orderBy: { name: 'asc' },
          include: {
            memberships: { include: { company: true } },
            contactLinks: {
              where: { isPrimary: true },
              include: {
                contact: {
                  select: {
                    id: true,
                    name: true,
                    whatsapp: true,
                    email: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      return { companies, users, isGlobalView: true };
    }

    const companyIds = await this.getManagedCompanyIds(requester.userId);
    if (!companyIds.length) {
      return { companies: [], users: [], isGlobalView: false };
    }

    const [companies, users] = await Promise.all([
      this.prisma.company.findMany({
        where: { id: { in: companyIds }, deletedAt: null },
        orderBy: { razaoSocial: 'asc' },
        select: { id: true, razaoSocial: true, nomeFantasia: true },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          role: { in: CLIENT_ROLES },
          memberships: { some: { companyId: { in: companyIds } } },
        },
        include: {
          memberships: {
            where: { companyId: { in: companyIds } },
            include: { company: true },
          },
          contactLinks: {
            where: { isPrimary: true, companyId: { in: companyIds } },
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  whatsapp: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { companies, users, isGlobalView: false };
  }

  async getSystemAdminView(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    if (!this.isSystemRole(requester.role)) {
      return { users: [], isGlobalView: false };
    }

    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, role: { in: SYSTEM_ROLES } },
      orderBy: { name: 'asc' },
      include: {
        memberships: { include: { company: true } },
        contactLinks: {
          where: { isPrimary: true },
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                whatsapp: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return { users, isGlobalView: true };
  }

  async getClientUserEditView(userId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const isSystemRole = this.isSystemRole(requester.role);

    if (!isSystemRole && requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    const managedCompanyIds = requester.role === Role.CLIENTE_ADMIN
      ? await this.getManagedCompanyIds(requester.userId)
      : null;

    const safeCompanyFilter = managedCompanyIds?.length ? managedCompanyIds : ['__none__'];

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        role: { in: CLIENT_ROLES },
        ...(requester.role === Role.CLIENTE_ADMIN
          ? { memberships: { some: { companyId: { in: safeCompanyFilter } } } }
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
          select: { companyId: true },
        },
        contactLinks: {
          select: {
            companyId: true,
            contactId: true,
            isPrimary: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario nao encontrado.');

    const companies = await this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(requester.role === Role.CLIENTE_ADMIN ? { id: { in: safeCompanyFilter } } : {}),
      },
      orderBy: { razaoSocial: 'asc' },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
      },
    });

    return {
      userId: user.id,
      companies,
      isAdmin: requester.role !== Role.CLIENTE_ADMIN,
        initialData: {
        name: user.name ?? '',
        email: user.email,
        role: user.role,
        companyId: user.memberships[0]?.companyId ?? '',
        additionalCompanyIds: user.memberships.slice(1).map((m) => m.companyId),
        primaryContactId:
          user.contactLinks.find((link) => link.companyId === (user.memberships[0]?.companyId ?? ''))?.contactId ?? '',
        jobTitle: user.jobTitle ?? '',
        phone: user.phone ?? '',
        cpf: user.cpf ?? '',
        password: '',
      },
    };
  }

  async getSystemUserEditView(userId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    if (requester.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    const user = await this.prisma.user.findFirst({
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

    if (!user) throw new NotFoundException('Usuario nao encontrado.');

    return {
      userId: user.id,
      initialData: {
        name: user.name ?? '',
        email: user.email,
        role: user.role,
        primaryContactId: '',
        jobTitle: user.jobTitle ?? '',
        phone: user.phone ?? '',
        cpf: user.cpf ?? '',
        password: '',
      },
    };
  }

  private isSystemRole(role: Role) {
    return SYSTEM_ROLES.includes(role);
  }

  private normalizeContactId(value?: string | null): string | null {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private resolveUserName(inputName?: string | null): string | undefined {
    if (inputName === undefined) return undefined;
    const normalized = String(inputName ?? '').trim();
    return normalized || undefined;
  }

  private async syncPrimaryContactLink(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
    primaryContactId: string | null,
  ) {
    if (!primaryContactId) {
      await tx.userContactLink.deleteMany({
        where: { userId, companyId },
      });
      return;
    }

    const contact = await tx.companyContact.findFirst({
      where: {
        id: primaryContactId,
        companyId,
      },
      select: { id: true },
    });

    if (!contact) {
      throw new ForbiddenException('Contato informado nao pertence a empresa principal selecionada.');
    }

    await tx.userContactLink.upsert({
      where: { userId_companyId: { userId, companyId } },
      create: {
        userId,
        companyId,
        contactId: primaryContactId,
        isPrimary: true,
      },
      update: {
        contactId: primaryContactId,
        isPrimary: true,
      },
    });
  }

  private async getManagedCompanyIds(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { companyId: true },
    });
    return memberships.map((m) => m.companyId);
  }

  private async assertClientManagerCanManageTarget(managerUserId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true, deletedAt: true },
    });

    if (!targetUser || targetUser.deletedAt) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (!CLIENT_ROLES.includes(targetUser.role)) {
      throw new ForbiddenException('Voce nao pode editar este usuario.');
    }

    const managedCompanyIds = await this.getManagedCompanyIds(managerUserId);
    if (!managedCompanyIds.length) {
      throw new ForbiddenException('Voce nao pode editar este usuario.');
    }

    const targetMembership = await this.prisma.membership.findFirst({
      where: { userId: targetUserId, companyId: { in: managedCompanyIds } },
      select: { id: true },
    });

    if (!targetMembership) {
      throw new ForbiddenException('Voce nao pode editar este usuario.');
    }
  }

  private async assertCanManageMembershipChange(
    requester: { userId: string; role: Role },
    targetUserId: string,
    companyId: string,
    roleToApply?: Role,
  ) {
    if (this.isSystemRole(requester.role)) return;

    if (requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    await this.assertClientManagerCanManageTarget(requester.userId, targetUserId);

    const managedCompanyIds = await this.getManagedCompanyIds(requester.userId);
    if (!managedCompanyIds.includes(companyId)) {
      throw new ForbiddenException('Empresa invalida para este gestor.');
    }

    if (roleToApply && !CLIENT_ROLES.includes(roleToApply)) {
      throw new ForbiddenException('Perfil invalido para contexto de cliente.');
    }
  }

  private async getRequester(rawHeaders?: IncomingHttpHeaders) {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return { userId: requester.id, role: requester.role };
  }

  private toHeaders(rawHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!rawHeaders) return headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value);
      }
    }

    return headers;
  }
}
