import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
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
  contactId?: string;
  cpf?: string;
  jobTitle?: string;
  phone?: string;
};

type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: Role;
  contactId?: string | null;
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

    const where: any = { deletedAt: null };
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
        { contact: { is: { name: { contains: filters.search, mode: 'insensitive' } } } },
        ...(searchRaw ? [{ cpf: { contains: searchRaw } }] : []),
      ];
    }

    if (filters?.role && filters.role !== 'ALL' && isSystemRole) {
      where.role = filters.role as Role;
    }

    return this.prisma.user.findMany({
      where,
      include: this.userInclude(),
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
      include: this.userInclude(),
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

    const normalizedContactId = this.normalizeContactId(data.contactId);
    if (!normalizedContactId) {
      throw new BadRequestException('Contato obrigatorio para criar usuario.');
    }

    if (isClientManager) {
      const managedCompanyIds = await this.getManagedCompanyIds(requester.userId);
      if (data.role && !CLIENT_ROLES.includes(data.role)) {
        throw new ForbiddenException('Gestor pode cadastrar apenas usuarios da unidade.');
      }
      await this.assertContactWithinCompanies(normalizedContactId, managedCompanyIds, true);
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
      const userRole = data.role || Role.CLIENTE_USER;

      await (tx.user as any).update({
        where: { id: createdUserId },
        data: {
          name: data.name || null,
          role: userRole,
          contactId: normalizedContactId,
          cpf: data.cpf || null,
          jobTitle: data.jobTitle || null,
          phone: data.phone || null,
          isActive: true,
          emailVerified: true,
        },
      });

      await this.syncAccessFromContact(tx, createdUserId, userRole, normalizedContactId);

      return (tx.user as any).findUnique({
        where: { id: createdUserId },
        include: this.userInclude(),
      });
    });
  }

  async update(id: string, data: UpdateUserInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const isSystemRole = this.isSystemRole(requester.role);
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!isSystemRole && !isClientManager) throw new ForbiddenException('Acesso negado.');

    const user = await (this.prisma.user as any).findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');

    let managedCompanyIds: string[] = [];
    if (isClientManager) {
      await this.assertClientManagerCanManageTarget(requester.userId, id);

      if (data.role && !CLIENT_ROLES.includes(data.role)) {
        throw new ForbiddenException('Gestor nao pode atribuir perfil interno.');
      }

      managedCompanyIds = await this.getManagedCompanyIds(requester.userId);
    }

    const normalizedContactId = data.contactId === undefined
      ? undefined
      : this.normalizeContactId(data.contactId);

    if (data.contactId !== undefined && !normalizedContactId) {
      throw new BadRequestException('Contato obrigatorio para atualizar usuario.');
    }

    if (isClientManager && normalizedContactId) {
      await this.assertContactWithinCompanies(normalizedContactId, managedCompanyIds, true);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedUser = await (tx.user as any).update({
        where: { id },
        data: {
          name: this.resolveUserName(data.name),
          email: data.email,
          role: data.role,
          ...(normalizedContactId !== undefined ? { contactId: normalizedContactId } : {}),
          isActive: data.isActive,
          cpf: data.cpf,
          jobTitle: data.jobTitle,
          phone: data.phone,
        },
      });

      const effectiveRole = data.role ?? updatedUser.role;
      const effectiveContactId = normalizedContactId ?? updatedUser.contactId;

      if (!effectiveContactId) {
        throw new BadRequestException('Usuario precisa permanecer vinculado a um contato.');
      }

      await this.syncAccessFromContact(tx, id, effectiveRole, effectiveContactId);

      return updatedUser;
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
          include: this.userInclude(),
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
      include: this.userInclude(companyIds),
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
      include: this.userInclude(),
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

    const user = await (this.prisma.user as any).findFirst({
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
        contactId: true,
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
        contactId: user.contactId ?? '',
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

    const user = await (this.prisma.user as any).findFirst({
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
        contactId: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario nao encontrado.');

    return {
      userId: user.id,
      initialData: {
        name: user.name ?? '',
        email: user.email,
        role: user.role,
        contactId: user.contactId ?? '',
        jobTitle: user.jobTitle ?? '',
        phone: user.phone ?? '',
        cpf: user.cpf ?? '',
        password: '',
      },
    };
  }

  private userInclude(companyScope?: string[]) {
    return {
      memberships: {
        ...(companyScope ? { where: { companyId: { in: companyScope } } } : {}),
        include: { company: true },
      },
      contact: {
        select: {
          id: true,
          name: true,
          whatsapp: true,
          email: true,
          companyId: true,
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
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
        },
      },
    } as any;
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

  private async syncAccessFromContact(
    tx: Prisma.TransactionClient,
    userId: string,
    role: Role,
    contactId: string,
  ) {
    if (this.isSystemRole(role)) {
      await tx.membership.deleteMany({
        where: { userId },
      });
      await tx.userContactLink.deleteMany({
        where: { userId },
      });
      return;
    }

    const contact = await (tx.companyContact as any).findFirst({
      where: { id: contactId },
      select: {
        id: true,
        companyId: true,
        companyLinks: {
          select: {
            companyId: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contato informado nao encontrado.');
    }

    const companyIds = this.extractContactCompanyIds(contact);

    if (!companyIds.length) {
      throw new BadRequestException('Contato do usuario precisa estar vinculado a uma empresa.');
    }

    const membershipRole = role === Role.CLIENTE_ADMIN ? Role.CLIENTE_ADMIN : Role.CLIENTE_USER;

    await tx.membership.deleteMany({
      where: { userId, companyId: { notIn: companyIds } },
    });

    for (const companyId of companyIds) {
      await tx.membership.upsert({
        where: { userId_companyId: { userId, companyId } },
        create: {
          userId,
          companyId,
          role: membershipRole,
        },
        update: {
          role: membershipRole,
        },
      });
    }

    await tx.userContactLink.deleteMany({
      where: { userId, companyId: { notIn: companyIds } },
    });

    for (const [index, companyId] of companyIds.entries()) {
      await tx.userContactLink.upsert({
        where: { userId_companyId: { userId, companyId } },
        create: {
          userId,
          companyId,
          contactId,
          isPrimary: index === 0,
        },
        update: {
          contactId,
          isPrimary: index === 0,
        },
      });
    }
  }

  private async assertContactWithinCompanies(
    contactId: string,
    allowedCompanyIds: string[],
    requireCompany: boolean,
  ) {
    const contact = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      select: {
        id: true,
        companyId: true,
        companyLinks: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contato informado nao encontrado.');
    }

    const companyIds = this.extractContactCompanyIds(contact);

    if (requireCompany && !companyIds.length) {
      throw new BadRequestException('Contato precisa estar vinculado a uma empresa.');
    }

    if (companyIds.some((companyId) => !allowedCompanyIds.includes(companyId))) {
      throw new ForbiddenException('Contato informado nao pertence a uma empresa permitida para este gestor.');
    }
  }

  private extractContactCompanyIds(contact: any): string[] {
    const fromLinks = Array.isArray(contact?.companyLinks)
      ? contact.companyLinks.map((link: any) => link.companyId).filter(Boolean)
      : [];

    if (fromLinks.length) return Array.from(new Set(fromLinks));
    if (contact?.companyId) return [contact.companyId];
    return [];
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
