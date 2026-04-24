import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import type { IncomingHttpHeaders } from 'node:http';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { IntegrationContextService, type ResolvedIntegrationContext } from '../settings/integration-context.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { UserContactAccessService } from './user-contact-access.service';
import {
  createUserSchema,
  updateUserSchema,
  userAccessListItemSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserAccessListItem,
  type UserEmailAvailabilityResult,
} from '@dosc-syspro/contracts/user';

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];
const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DEVELOPER]: 'Desenvolvedor',
  [Role.SUPORTE]: 'Suporte',
  [Role.CLIENTE_ADMIN]: 'Gestor da Unidade',
  [Role.CLIENTE_USER]: 'Usuario',
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly chatwootClient: ChatwootClient,
    private readonly integrationContext: IntegrationContextService,
    private readonly authorizationService: AuthorizationService,
    private readonly userContactAccessService: UserContactAccessService,
  ) {}

  async findAll(filters?: { search?: string; role?: string }, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);

    const where: any = { deletedAt: null };
    const isGlobalView = await this.authorizationService.userHasPermission(requester, 'users:view_all');
    const canViewTeam = await this.authorizationService.userHasPermission(requester, 'users:view_team', {
      acceptCompanyScope: true,
    });

    if (!isGlobalView) {
      if (requester.role !== Role.CLIENTE_ADMIN || !canViewTeam) {
        throw new ForbiddenException('Acesso negado.');
      }

      const companyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
      if (!companyIds.length) return [];

      where.role = { in: CLIENT_ROLES };
      where.memberships = { some: { companyId: { in: companyIds } } };
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { contact: { is: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    if (filters?.role && filters.role !== 'ALL' && isGlobalView) {
      where.role = filters.role as Role;
    }

    const users = await this.prisma.user.findMany({
      where,
      include: this.userInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.serializeUserAccessListItem(user));
  }

  async findOne(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const isGlobalView = await this.authorizationService.userHasPermission(requester, 'users:view_all');

    if (!isGlobalView && requester.role === Role.CLIENTE_ADMIN) {
      await this.assertClientManagerCanManageTarget(requester.userId, id);
    }

    if (!isGlobalView && requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Acesso negado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude(),
    });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    return this.serializeUserAccessListItem(user);
  }

  async checkEmailAvailability(email: string, rawHeaders?: IncomingHttpHeaders): Promise<UserEmailAvailabilityResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canCreateUsers = await this.authorizationService.userHasPermission(requester, 'users:create', {
      acceptCompanyScope: true,
    });
    const isGlobalUserManager = await this.authorizationService.userHasPermission(requester, 'users:view_all');
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!canCreateUsers || (!isGlobalUserManager && !isClientManager)) {
      throw new ForbiddenException('Acesso negado.');
    }

    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      return {
        available: false,
        code: 'INVALID_EMAIL',
        message: 'Informe um e-mail valido.',
      };
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!existingUser) {
      return {
        available: true,
        code: 'AVAILABLE',
        message: 'E-mail disponivel para cadastro.',
      };
    }

    if (existingUser.deletedAt || !existingUser.isActive) {
      return {
        available: false,
        code: 'LOCAL_INACTIVE_EXISTS',
        message: 'Ja existe um usuario inativo ou excluido com este e-mail.',
      };
    }

    return {
      available: false,
      code: 'LOCAL_ACTIVE_EXISTS',
      message: 'Este e-mail ja esta cadastrado como usuario.',
    };
  }

  async create(input: CreateUserInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const isGlobalUserManager = await this.authorizationService.userHasPermission(requester, 'users:view_all');
    const canCreateUsers = await this.authorizationService.userHasPermission(requester, 'users:create', {
      acceptCompanyScope: true,
    });
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!canCreateUsers || (!isGlobalUserManager && !isClientManager)) {
      throw new ForbiddenException('Acesso negado.');
    }

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const normalizedEmail = this.normalizeEmail(data.email);
    if (!normalizedEmail) {
      throw new BadRequestException('E-mail obrigatorio para criar usuario.');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (existingUser.deletedAt || !existingUser.isActive) {
        this.logger.warn(
          `[users.create.conflict] email=${normalizedEmail} source=local_user_inactive_or_deleted userId=${existingUser.id}`
        );
        throw new ConflictException('Ja existe um usuario inativo ou excluido com este e-mail. Reative o cadastro existente ou use outro e-mail.');
      }
      this.logger.warn(
        `[users.create.conflict] email=${normalizedEmail} source=local_user_active userId=${existingUser.id}`
      );
      throw new ConflictException('Este e-mail ja esta cadastrado como usuario.');
    }

    const normalizedContactId = this.normalizeContactId(data.contactId);
    if (!normalizedContactId) {
      throw new BadRequestException('Contato obrigatorio para criar usuario.');
    }

    const userRole = data.role || Role.CLIENTE_USER;
    this.assertRequesterCanManageRole(requester.role, userRole);

    if (isClientManager) {
      const managedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
      if (!CLIENT_ROLES.includes(userRole)) {
        throw new ForbiddenException('Gestor pode cadastrar apenas usuarios da unidade.');
      }
      await this.assertContactWithinCompanies(normalizedContactId, managedCompanyIds, true);
    }

    let authResult;
    try {
      authResult = await this.authService.auth.api.createUser({
        headers: new Headers(),
        body: {
          email: normalizedEmail,
          name: data.name || 'Sem nome',
          password: data.password || Math.random().toString(36).slice(-10),
          role: this.authorizationService.isSystemRole(data.role || Role.CLIENTE_USER) ? 'admin' : 'user',
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `[users.create.conflict] email=${normalizedEmail} source=auth_provider message=${error instanceof Error ? error.message : String(error ?? 'unknown')}`
      );
      throw new ConflictException(this.resolveUserCreateConflictMessage(error));
    }

    if (!authResult?.user) throw new Error('Falha critica ao obter o ID do novo usuario.');
    const createdUserId = authResult.user.id;

    const createdUser = await this.prisma.$transaction(async (tx) => {
      await (tx.user as any).update({
        where: { id: createdUserId },
        data: {
          name: data.name || null,
          role: userRole,
          contactId: normalizedContactId,
          isActive: true,
          emailVerified: true,
        },
      });

      await this.userContactAccessService.syncAccessFromContact(tx, createdUserId, userRole, normalizedContactId);

      return (tx.user as any).findUnique({
        where: { id: createdUserId },
        include: this.userInclude(),
      });
    });

    await this.syncPortalUserToChatwootSafe(createdUserId);
    return createdUser;
  }

  private normalizeEmail(value?: string | null) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized || null;
  }

  private resolveUserCreateConflictMessage(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? '');
    const message = rawMessage.trim();
    const lower = message.toLowerCase();

    if (
      lower.includes('already exists') ||
      lower.includes('already been used') ||
      lower.includes('email already') ||
      lower.includes('user already exists') ||
      lower.includes('duplicate')
    ) {
      return 'Este e-mail ja existe na autenticacao do sistema. Verifique usuarios inativos, excluidos ou cadastros antigos.';
    }

    return message || 'Falha ao criar usuario na autenticacao segura.';
  }

  async update(id: string, input: UpdateUserInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const isGlobalUserManager = await this.authorizationService.userHasPermission(requester, 'users:view_all');
    const canEditUsers = await this.authorizationService.userHasPermission(requester, 'users:edit', {
      acceptCompanyScope: true,
    });
    const isClientManager = requester.role === Role.CLIENTE_ADMIN;

    if (!canEditUsers || (!isGlobalUserManager && !isClientManager)) throw new ForbiddenException('Acesso negado.');

    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    const user = await (this.prisma.user as any).findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario nao encontrado');
    this.assertRequesterCanManageRole(requester.role, user.role);
    if (data.role) {
      this.assertRequesterCanManageRole(requester.role, data.role);
    }

    let managedCompanyIds: string[] = [];
    if (isClientManager) {
      await this.assertClientManagerCanManageTarget(requester.userId, id);

      if (data.role && !CLIENT_ROLES.includes(data.role)) {
        throw new ForbiddenException('Gestor nao pode atribuir perfil interno.');
      }

      managedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
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

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await (tx.user as any).update({
        where: { id },
        data: {
          name: this.resolveUserName(data.name),
          email: data.email,
          role: data.role,
          ...(normalizedContactId !== undefined ? { contactId: normalizedContactId } : {}),
          isActive: data.isActive,
        },
      });

      const effectiveRole = data.role ?? updatedUser.role;
      const effectiveContactId = normalizedContactId ?? updatedUser.contactId;

      if (!effectiveContactId) {
        throw new BadRequestException('Usuario precisa permanecer vinculado a um contato.');
      }

      await this.userContactAccessService.syncAccessFromContact(tx, id, effectiveRole, effectiveContactId);

      return updatedUser;
    });

    await this.syncPortalUserToChatwootSafe(id);
    return updatedUser;
  }

  async remove(id: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const isGlobalView = await this.authorizationService.userHasPermission(requester, 'users:view_all');
    const canUpdateStatus = await this.authorizationService.userHasPermission(requester, 'users:status', {
      acceptCompanyScope: true,
    });
    if (requester.userId === id) throw new ForbiddenException('Operacao invalida.');
    if (!canUpdateStatus) throw new ForbiddenException('Acesso negado.');

    if (!isGlobalView) {
      if (requester.role !== Role.CLIENTE_ADMIN) throw new ForbiddenException('Acesso negado.');
      await this.assertClientManagerCanManageTarget(requester.userId, id);
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!targetUser) throw new NotFoundException('Usuario nao encontrado');
    this.assertRequesterCanManageRole(requester.role, targetUser.role);

    const removedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    await this.syncPortalUserToChatwootSafe(id);
    return removedUser;
  }

  async getChatwootSsoLinkForCurrentUser(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!this.authorizationService.isSystemRole(requester.role)) {
      throw new ForbiddenException('Acesso ao Chatwoot permitido apenas para atendentes internos.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: requester.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    const context = await this.integrationContext.getDefaultContext();
    if (!context?.chatwoot.url || !context.chatwoot.accountId || !context.chatwoot.platformApiToken) {
      throw new BadRequestException('SSO do Chatwoot nao configurado. Defina CHATWOOT_URL, CHATWOOT_ACCOUNT_ID e CHATWOOT_PLATFORM_API_TOKEN.');
    }

    const chatwootRole = this.mapRoleToChatwoot(user.role);
    const fallbackUrl = this.buildChatwootFallbackUrl(context.chatwoot.url, context.chatwoot.accountId);

    let agents: any[];
    try {
      agents = await this.chatwootClient.listAgents(context.chatwoot);
    } catch (error: any) {
      if (!this.isChatwootAvailabilityError(error)) {
        throw error;
      }

      this.logger.warn(
        `Chatwoot indisponivel ao listar agentes para ${user.email}. Redirecionando para a URL base da conta. Motivo: ${error.message}`
      );
      return { url: fallbackUrl };
    }

    let agent = agents.find((item: any) => String(item?.email ?? '').trim().toLowerCase() === user.email.toLowerCase());

    if (!agent) {
      let created: any;
      try {
        created = await this.chatwootClient.createPlatformUser(context.chatwoot, {
          name: user.name?.trim() || user.email,
          displayName: user.name?.trim() || user.email,
          email: user.email,
          customAttributes: {
            portal_user_id: user.id,
            portal_role: user.role,
          },
        });
      } catch (error: any) {
        if (!this.isChatwootAvailabilityError(error)) {
          throw error;
        }

        this.logger.warn(
          `Chatwoot indisponivel ao provisionar ${user.email}. Redirecionando para a URL base da conta. Motivo: ${error.message}`
        );
        return { url: fallbackUrl };
      }

      const createdId = String(created?.id ?? '').trim();
      if (!createdId) {
        throw new Error('Falha ao provisionar usuario no Chatwoot.');
      }

      const isAlreadyInAccount = Array.isArray(created?.accounts)
        ? created.accounts.some((account: any) => String(account?.id ?? '') === context.chatwoot.accountId)
        : false;

      if (!isAlreadyInAccount) {
        try {
          await this.chatwootClient.createAccountUser(context.chatwoot, createdId, chatwootRole);
        } catch (error: any) {
          if (!this.isChatwootAvailabilityError(error)) {
            throw error;
          }

          this.logger.warn(
            `Chatwoot indisponivel ao vincular ${user.email} na conta ${context.chatwoot.accountId}. Redirecionando para a URL base da conta. Motivo: ${error.message}`
          );
          return { url: fallbackUrl };
        }
      }

      agent = { ...created, id: createdId, email: user.email };
      this.logger.log(`Usuario ${user.email} provisionado no Chatwoot com role ${chatwootRole}.`);
    } else {
      try {
        await this.chatwootClient.updatePlatformUser(context.chatwoot, String(agent.id), {
          name: user.name?.trim() || user.email,
          displayName: user.name?.trim() || user.email,
          email: user.email,
          customAttributes: {
            portal_user_id: user.id,
            portal_role: user.role,
          },
        });
      } catch (error: any) {
        if (this.isChatwootNonPermissibleResourceError(error)) {
          this.logger.warn(
            `Platform App sem permissao para atualizar o usuario ${user.email} no Chatwoot. Seguindo com o SSO sem sincronizar perfil.`
          );
        } else if (this.isChatwootAvailabilityError(error)) {
          this.logger.warn(
            `Chatwoot indisponivel ao atualizar o usuario ${user.email}. Redirecionando para a URL base da conta. Motivo: ${error.message}`
          );
          return { url: fallbackUrl };
        } else {
          throw error;
        }
      }
    }

    let url: string;
    try {
      url = await this.chatwootClient.getUserSsoLink(context.chatwoot, String(agent.id));
    } catch (error: any) {
      if (this.isChatwootAvailabilityError(error)) {
        this.logger.warn(
          `Chatwoot indisponivel ao gerar SSO do usuario ${user.email}. Redirecionando para a URL base da conta. Motivo: ${error.message}`
        );
        return { url: fallbackUrl };
      }

      if (!this.isChatwootNonPermissibleResourceError(error)) {
        throw error;
      }

      url = fallbackUrl;
      this.logger.warn(
        `Platform App sem permissao para gerar SSO do usuario ${user.email} no Chatwoot. Redirecionando para a URL base da conta.`
      );
    }

    return { url };
  }

  private isChatwootNonPermissibleResourceError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('Non permissible resource') || message.includes(': 401 -') || message.includes(': 403 -');
  }

  private isChatwootAvailabilityError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
      message.includes(': 500 -') ||
      message.includes(': 502 -') ||
      message.includes(': 503 -') ||
      message.includes(': 504 -') ||
      message.includes('Bad Gateway') ||
      message.includes('Internal Server Error')
    );
  }

  private buildChatwootFallbackUrl(baseUrl: string, accountId?: string | null): string {
    const normalizedBaseUrl = String(baseUrl ?? '').replace(/\/+$/, '');
    const normalizedAccountId = String(accountId ?? '').trim();
    if (!normalizedAccountId) {
      return normalizedBaseUrl;
    }

    return `${normalizedBaseUrl}/app/accounts/${normalizedAccountId}`;
  }

  private async syncPortalUserToChatwootSafe(userId: string) {
    try {
      await this.syncPortalUserToChatwoot(userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'unknown_error');
      this.logger.warn(`Falha ao sincronizar usuario ${userId} com Chatwoot: ${message}`);
    }
  }

  private async syncPortalUserToChatwoot(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        deletedAt: true,
        memberships: {
          select: { companyId: true },
        },
      },
    });

    if (!user) {
      return;
    }

    const companyIds = Array.from(new Set(user.memberships.map((membership) => membership.companyId)));
    const contexts = await this.integrationContext.listActiveContexts();
    const dedupedContexts = this.dedupeChatwootContexts(contexts);

    if (!dedupedContexts.length) {
      return;
    }

    const shouldProvision = this.authorizationService.isSystemRole(user.role) && user.isActive && !user.deletedAt;
    if (!shouldProvision) {
      await this.removePortalUserFromChatwoot(user.email, dedupedContexts);
      return;
    }

    const chatwootRole = this.mapRoleToChatwoot(user.role);
    const customAttributes = {
      portal_user_id: user.id,
      portal_role: user.role,
      portal_is_active: user.isActive,
      portal_company_ids: companyIds,
    };

    const platformUserIdByBase = new Map<string, string>();

    for (const context of dedupedContexts) {
      if (!context.chatwoot.url || !context.chatwoot.accountId || !context.chatwoot.platformApiToken) {
        continue;
      }

      const cacheKey = context.chatwoot.url.replace(/\/+$/, '').toLowerCase();
      let platformUserId = platformUserIdByBase.get(cacheKey);
      let accountAgent = null as any;

      if (!platformUserId) {
        const agents = await this.chatwootClient.listAgents(context.chatwoot);
        accountAgent = agents.find((item: any) => String(item?.email ?? '').trim().toLowerCase() === user.email.toLowerCase()) ?? null;
        platformUserId = accountAgent ? String(accountAgent.id ?? '').trim() : '';
      }

      if (!platformUserId) {
        const created = await this.chatwootClient.createPlatformUser(context.chatwoot, {
          name: user.name?.trim() || user.email,
          displayName: user.name?.trim() || user.email,
          email: user.email,
          customAttributes,
        });

        platformUserId = String(created?.id ?? '').trim();
        if (!platformUserId) {
          throw new Error(`Falha ao provisionar usuario ${user.email} no Chatwoot.`);
        }
      } else {
        await this.chatwootClient.updatePlatformUser(context.chatwoot, platformUserId, {
          name: user.name?.trim() || user.email,
          displayName: user.name?.trim() || user.email,
          email: user.email,
          customAttributes,
        });
      }

      platformUserIdByBase.set(cacheKey, platformUserId);

      const alreadyInAccount = accountAgent
        ? true
        : await this.chatwootUserExistsInAccount(context, platformUserId);

      if (!alreadyInAccount) {
        await this.chatwootClient.createAccountUser(context.chatwoot, platformUserId, chatwootRole);
      }
    }
  }

  private async removePortalUserFromChatwoot(email: string, contexts: ResolvedIntegrationContext[]) {
    const userIdsByBase = new Map<string, string>();

    for (const context of contexts) {
      if (!context?.chatwoot.url || !context.chatwoot.platformApiToken) {
        continue;
      }

      const cacheKey = context.chatwoot.url.replace(/\/+$/, '').toLowerCase();
      if (userIdsByBase.has(cacheKey)) {
        continue;
      }

      const agents = await this.chatwootClient.listAgents(context.chatwoot);
      const agent = agents.find((item: any) => String(item?.email ?? '').trim().toLowerCase() === email.toLowerCase()) ?? null;
      const platformUserId = String(agent?.id ?? '').trim();
      if (!platformUserId) {
        continue;
      }

      await this.chatwootClient.deletePlatformUser(context.chatwoot, platformUserId);
      userIdsByBase.set(cacheKey, platformUserId);
    }
  }

  private dedupeChatwootContexts(contexts: ResolvedIntegrationContext[]) {
    const seen = new Set<string>();
    return contexts.filter((context) => {
      const key = [
        context.chatwoot.url.replace(/\/+$/, '').toLowerCase(),
        context.chatwoot.accountId,
      ].join('|');

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async chatwootUserExistsInAccount(
    context: ResolvedIntegrationContext,
    platformUserId: string,
  ) {
    const agents = await this.chatwootClient.listAgents(context.chatwoot);
    return agents.some((item: any) => String(item?.id ?? '').trim() === platformUserId);
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
    } as any;
  }

  private serializeUserAccessListItem(user: any): UserAccessListItem {
    const primaryContactLink = user.contact?.companyLinks?.[0] ?? null;

    return userAccessListItemSchema.parse({
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      image: user.image ?? null,
      role: user.role,
      isActive: Boolean(user.isActive),
      deletedAt: user.deletedAt ? new Date(user.deletedAt).toISOString() : null,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      memberships: Array.isArray(user.memberships)
        ? user.memberships.map((membership: any) => ({
            companyId: membership.companyId,
            role: membership.role,
            company: {
              nomeFantasia: membership.company?.nomeFantasia ?? null,
              razaoSocial: membership.company?.razaoSocial ?? '',
            },
          }))
        : [],
      contact: user.contact
        ? {
            id: user.contact.id,
            name: user.contact.name,
            whatsapp: user.contact.whatsapp ?? null,
            email: user.contact.email ?? null,
            phone: user.contact.phone ?? null,
            companyId: primaryContactLink?.companyId ?? null,
            company: primaryContactLink?.company
              ? {
                  id: primaryContactLink.company.id,
                  nomeFantasia: primaryContactLink.company.nomeFantasia ?? null,
                  razaoSocial: primaryContactLink.company.razaoSocial,
                }
              : null,
          }
        : null,
      companyName:
        primaryContactLink?.company?.nomeFantasia ||
        primaryContactLink?.company?.razaoSocial ||
        user.memberships?.[0]?.company?.nomeFantasia ||
        user.memberships?.[0]?.company?.razaoSocial ||
        'Sem Vinculo',
      companyId: primaryContactLink?.companyId ?? user.memberships?.[0]?.companyId ?? null,
    });
  }

  private mapRoleToChatwoot(role: Role): 'agent' | 'administrator' {
    if (role === Role.ADMIN || role === Role.DEVELOPER) {
      return 'administrator';
    }
    return 'agent';
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

  private async assertContactWithinCompanies(
    contactId: string,
    allowedCompanyIds: string[],
    requireCompany: boolean,
  ) {
    const companyIds = await this.userContactAccessService.getContactCompanyIds(
      this.prisma as any,
      contactId,
      requireCompany,
    );

    if (companyIds.some((companyId) => !allowedCompanyIds.includes(companyId))) {
      throw new ForbiddenException('Contato informado nao pertence a uma empresa permitida para este gestor.');
    }
  }

  private getManageableRolesForRequester(role: Role): Role[] {
    if (role === Role.ADMIN) return [...SYSTEM_ROLES, ...CLIENT_ROLES];
    if (role === Role.DEVELOPER) return [Role.DEVELOPER];
    if (role === Role.SUPORTE) return [Role.SUPORTE];
    if (role === Role.CLIENTE_ADMIN) return [...CLIENT_ROLES];
    return [];
  }

  private assertRequesterCanManageRole(requesterRole: Role, targetRole: Role) {
    const allowedRoles = this.getManageableRolesForRequester(requesterRole);
    if (!allowedRoles.includes(targetRole)) {
      throw new ForbiddenException(
        `${ROLE_LABELS[requesterRole]} nao pode gerenciar usuario com perfil ${ROLE_LABELS[targetRole]}.`,
      );
    }
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

    const managedCompanyIds = await this.authorizationService.getManagedCompanyIds(managerUserId);
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

}
