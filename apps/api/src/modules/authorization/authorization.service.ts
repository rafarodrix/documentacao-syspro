import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import type {
  SettingsAccessProfileUpsertInput,
  SettingsAuthorizationContext,
  SettingsPermissionKey,
  SettingsPermissionsAdminView,
  SettingsProfileKey,
  SettingsPermissionsCatalog,
  SettingsUserAccessProfileCreateInput,
} from '@dosc-syspro/contracts/settings';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SETTINGS_PERMISSION_DEFINITIONS,
  buildDefaultPermissionProfiles,
} from '../settings/permissions/permissions.catalog';

type Requester = {
  userId: string;
  email: string;
  role: Role;
};

type PermissionAssignment = {
  scopeType: 'GLOBAL' | 'COMPANY';
  companyId: string | null;
  permissionKeys: SettingsPermissionKey[];
};

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getRequester(rawHeaders?: IncomingHttpHeaders): Promise<Requester> {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return {
      userId: requester.id,
      email: requester.email,
      role: requester.role,
    };
  }

  async assertPermission(rawHeaders: IncomingHttpHeaders | undefined, permission: SettingsPermissionKey) {
    const requester = await this.getRequester(rawHeaders);
    const allowed = await this.userHasPermission(requester, permission);

    if (!allowed) {
      throw new ForbiddenException('Sem permissao para executar esta acao.');
    }

    return requester;
  }

  async userHasPermission(
    requester: Requester,
    permission: SettingsPermissionKey,
    options?: { acceptCompanyScope?: boolean },
  ) {
    await this.syncSystemAuthorizationCatalog();

    const fallbackPermissions = await this.getFallbackPermissionsForProfileKey(requester.role as SettingsProfileKey);
    if (fallbackPermissions.includes(permission)) {
      return true;
    }

    const assignments = await this.getPermissionAssignments(requester.userId);

    return assignments.some(
      (assignment) =>
        assignment.permissionKeys.includes(permission) &&
        (options?.acceptCompanyScope || assignment.scopeType === 'GLOBAL'),
    );
  }

  isSystemRole(role: Role) {
    return ([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as Role[]).includes(role);
  }

  async getManagedCompanyIds(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { companyId: true },
    });

    return Array.from(new Set(memberships.map((membership) => membership.companyId)));
  }

  async getUserCompanyIds(requester: Requester) {
    const companyIds = new Set<string>();

    const memberships = await this.prisma.membership.findMany({
      where: { userId: requester.userId },
      select: { companyId: true },
    });

    for (const membership of memberships) {
      companyIds.add(membership.companyId);
    }

    const contacts = await this.prisma.companyContact.findMany({
      where: { email: requester.email },
      select: {
        companyLinks: {
          select: { companyId: true },
        },
      },
    });

    for (const contact of contacts) {
      for (const link of contact.companyLinks) {
        companyIds.add(link.companyId);
      }
    }

    return Array.from(companyIds);
  }

  async resolveCompanyAccessScope(
    requester: Requester,
    scopedPermission: SettingsPermissionKey,
    globalPermission?: SettingsPermissionKey,
  ): Promise<{ isGlobal: boolean; companyIds: string[] }> {
    await this.syncSystemAuthorizationCatalog();

    const assignments = await this.getPermissionAssignments(requester.userId);
    const effectivePermissions = new Set<SettingsPermissionKey>();
    if (globalPermission) effectivePermissions.add(globalPermission);
    effectivePermissions.add(scopedPermission);

    const globalAssignment = assignments.some(
      (assignment) =>
        assignment.scopeType === 'GLOBAL' &&
        assignment.permissionKeys.some((permission) => effectivePermissions.has(permission)),
    );

    if (globalAssignment) {
      return { isGlobal: true, companyIds: [] };
    }

    const companyIdsFromAssignments = Array.from(
      new Set(
        assignments
          .filter(
            (assignment) =>
              assignment.scopeType === 'COMPANY' &&
              assignment.companyId &&
              assignment.permissionKeys.some((permission) => effectivePermissions.has(permission)),
          )
          .map((assignment) => assignment.companyId as string),
      ),
    );

    if (companyIdsFromAssignments.length > 0) {
      return { isGlobal: false, companyIds: companyIdsFromAssignments };
    }

    const fallbackPermissions = await this.getFallbackPermissionsForProfileKey(requester.role as SettingsProfileKey);
    if (globalPermission && fallbackPermissions.includes(globalPermission)) {
      return { isGlobal: true, companyIds: [] };
    }

    if (fallbackPermissions.includes(scopedPermission)) {
      return {
        isGlobal: false,
        companyIds: await this.getUserCompanyIds(requester),
      };
    }

    return { isGlobal: false, companyIds: [] };
  }

  async getCurrentAuthorizationContext(rawHeaders?: IncomingHttpHeaders): Promise<SettingsAuthorizationContext> {
    const requester = await this.getRequester(rawHeaders);
    await this.syncSystemAuthorizationCatalog();

    const fallbackPermissions = await this.getFallbackPermissionsForProfileKey(requester.role as SettingsProfileKey);
    const assignments = await this.getPermissionAssignments(requester.userId);
    const membershipCompanyIds = await this.getUserCompanyIds(requester);
    const globalPermissions = new Set<SettingsPermissionKey>();
    const companyPermissions = new Map<string, Set<SettingsPermissionKey>>();

    for (const assignment of assignments) {
      if (assignment.scopeType === 'GLOBAL') {
        assignment.permissionKeys.forEach((permission) => globalPermissions.add(permission));
        continue;
      }

      if (!assignment.companyId) continue;
      const current = companyPermissions.get(assignment.companyId) ?? new Set<SettingsPermissionKey>();
      assignment.permissionKeys.forEach((permission) => current.add(permission));
      companyPermissions.set(assignment.companyId, current);
    }

    return {
      userId: requester.userId,
      role: requester.role,
      fallbackPermissions,
      globalPermissions: Array.from(globalPermissions),
      companyPermissions: Object.fromEntries(
        Array.from(companyPermissions.entries()).map(([companyId, permissions]) => [companyId, Array.from(permissions)]),
      ),
      membershipCompanyIds,
    };
  }

  async getPermissionsCatalog(): Promise<SettingsPermissionsCatalog> {
    await this.syncSystemAuthorizationCatalog();

    const [permissions, profiles] = await Promise.all([
      this.prisma.permission.findMany({
        where: { isActive: true },
        orderBy: [{ moduleKey: 'asc' }, { key: 'asc' }],
        select: {
          key: true,
          label: true,
          moduleKey: true,
          description: true,
        },
      }),
      this.prisma.accessProfile.findMany({
        where: { isActive: true },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        select: {
          key: true,
          name: true,
          permissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      matrixEnabled: true,
      permissions: permissions.map((permission) => ({
        key: permission.key as SettingsPermissionKey,
        label: permission.label,
        module: permission.moduleKey,
        description: permission.description || '',
      })),
      profiles: profiles.map((profile) => ({
        key: profile.key as SettingsProfileKey,
        label: profile.name,
        permissions: profile.permissions.map((item) => item.permission.key as SettingsPermissionKey),
      })),
    };
  }

  async getPermissionsAdminView(): Promise<SettingsPermissionsAdminView> {
    const [catalog, profiles, users, companies, assignments] = await Promise.all([
      this.getPermissionsCatalog(),
      this.prisma.accessProfile.findMany({
        where: { isActive: true },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          isSystem: true,
          isActive: true,
          permissions: {
            select: {
              permission: {
                select: { key: true },
              },
            },
          },
        },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      }),
      this.prisma.company.findMany({
        where: { deletedAt: null },
        orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
        },
      }),
      this.prisma.userAccessProfile.findMany({
        where: {
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
          profile: { isActive: true },
          user: { deletedAt: null },
        },
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          scopeType: true,
          companyId: true,
          reason: true,
          startsAt: true,
          endsAt: true,
          assignedByUserId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          profile: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
          company: {
            select: {
              id: true,
              nomeFantasia: true,
              razaoSocial: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      catalog,
      profiles: profiles.map((profile) => ({
        id: profile.id,
        key: profile.key,
        label: profile.name,
        description: profile.description ?? undefined,
        isSystem: profile.isSystem,
        isActive: profile.isActive,
        permissions: profile.permissions.map((item) => item.permission.key as SettingsPermissionKey),
      })),
      users: users.map((user) => ({
        id: user.id,
        name: user.name?.trim() || user.email,
        email: user.email,
        role: user.role,
      })),
      companies: companies.map((company) => ({
        id: company.id,
        name: company.nomeFantasia?.trim() || company.razaoSocial,
      })),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        userId: assignment.user.id,
        userName: assignment.user.name?.trim() || assignment.user.email,
        userEmail: assignment.user.email,
        profileId: assignment.profile.id,
        profileKey: assignment.profile.key,
        profileLabel: assignment.profile.name,
        scopeType: assignment.scopeType,
        companyId: assignment.companyId,
        companyName: assignment.company ? assignment.company.nomeFantasia?.trim() || assignment.company.razaoSocial : null,
        assignedByUserId: assignment.assignedByUserId,
        assignedByUserName: assignment.assignedByUser?.name?.trim() || null,
        reason: assignment.reason ?? null,
        startsAt: assignment.startsAt.toISOString(),
        endsAt: assignment.endsAt?.toISOString() ?? null,
      })),
    };
  }

  async upsertAccessProfile(input: SettingsAccessProfileUpsertInput) {
    await this.syncSystemAuthorizationCatalog();

    const existingByKey = await this.prisma.accessProfile.findUnique({
      where: { key: input.key },
      select: { id: true, isSystem: true },
    });

    if (input.id) {
      const existingProfile = await this.prisma.accessProfile.findUnique({
        where: { id: input.id },
        select: { id: true, key: true, isSystem: true },
      });

      if (!existingProfile) {
        throw new ForbiddenException('Perfil nao encontrado.');
      }

      if (existingProfile.isSystem && input.key !== existingProfile.key) {
        throw new ForbiddenException('A chave de perfis padrao do sistema nao pode ser alterada.');
      }

      if (existingByKey && existingByKey.id !== existingProfile.id) {
        throw new ForbiddenException('Ja existe um perfil com esta chave.');
      }

      return this.prisma.$transaction(async (tx) => {
        const savedProfile = await tx.accessProfile.update({
          where: { id: existingProfile.id },
          data: {
            key: existingProfile.isSystem ? existingProfile.key : input.key,
            name: input.label,
            description: input.description?.trim() || null,
            isActive: existingProfile.isSystem ? true : input.isActive ?? true,
            isSystem: existingProfile.isSystem,
          },
          select: { id: true },
        });

        await this.replaceProfilePermissions(tx, savedProfile.id, input.permissions);
        return savedProfile;
      });
    }

    if (existingByKey) {
      throw new ForbiddenException('Ja existe um perfil com esta chave.');
    }

    return this.prisma.$transaction(async (tx) => {
      const savedProfile = await tx.accessProfile.create({
        data: {
          key: input.key,
          name: input.label,
          description: input.description?.trim() || null,
          isSystem: false,
          isActive: input.isActive ?? true,
        },
        select: { id: true },
      });

      await this.replaceProfilePermissions(tx, savedProfile.id, input.permissions);
      return savedProfile;
    });
  }

  async assignAccessProfile(requester: Requester, input: SettingsUserAccessProfileCreateInput) {
    await this.syncSystemAuthorizationCatalog();

    if (input.scopeType === 'COMPANY' && !input.companyId) {
      throw new ForbiddenException('Empresa obrigatoria para atribuicao por empresa.');
    }

    if (input.scopeType === 'GLOBAL' && input.companyId) {
      throw new ForbiddenException('Atribuicao global nao aceita empresa.');
    }

    const [user, profile, company] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, deletedAt: true },
      }),
      this.prisma.accessProfile.findUnique({
        where: { id: input.profileId },
        select: { id: true, isActive: true },
      }),
      input.companyId
        ? this.prisma.company.findUnique({
            where: { id: input.companyId },
            select: { id: true, deletedAt: true },
          })
        : Promise.resolve(null),
    ]);

    if (!user || user.deletedAt) {
      throw new ForbiddenException('Usuario informado nao encontrado.');
    }

    if (!profile || !profile.isActive) {
      throw new ForbiddenException('Perfil informado nao encontrado.');
    }

    if (input.companyId && (!company || company.deletedAt)) {
      throw new ForbiddenException('Empresa informada nao encontrada.');
    }

    const existingAssignment = await this.prisma.userAccessProfile.findFirst({
      where: {
        userId: input.userId,
        profileId: input.profileId,
        scopeType: input.scopeType,
        companyId: input.scopeType === 'COMPANY' ? input.companyId ?? null : null,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { id: true },
    });

    if (existingAssignment) {
      throw new ForbiddenException('Este perfil ja esta vinculado ao usuario neste escopo.');
    }

    const endsAt = input.endsAt ? new Date(input.endsAt) : null;

    return this.prisma.userAccessProfile.create({
      data: {
        userId: input.userId,
        profileId: input.profileId,
        scopeType: input.scopeType,
        companyId: input.scopeType === 'COMPANY' ? input.companyId ?? null : null,
        assignedByUserId: requester.userId,
        reason: input.reason?.trim() || null,
        endsAt,
      },
      select: { id: true },
    });
  }

  async removeAccessProfileAssignment(id: string) {
    const assignment = await this.prisma.userAccessProfile.findUnique({
      where: { id },
      select: { id: true, profile: { select: { isSystem: true } } },
    });

    if (!assignment) {
      throw new ForbiddenException('Vinculo nao encontrado.');
    }

    await this.prisma.userAccessProfile.delete({
      where: { id },
    });
  }

  async syncSystemAuthorizationCatalog() {
    await this.prisma.$transaction(async (tx) => {
      for (const permission of SETTINGS_PERMISSION_DEFINITIONS) {
        await tx.permission.upsert({
          where: { key: permission.key },
          update: {
            label: permission.label,
            moduleKey: permission.module,
            description: permission.description,
            isActive: true,
          },
          create: {
            key: permission.key,
            label: permission.label,
            moduleKey: permission.module,
            description: permission.description,
            isActive: true,
          },
        });
      }

      const defaultProfiles = buildDefaultPermissionProfiles();

      for (const profile of defaultProfiles) {
        const existingProfile = await tx.accessProfile.findUnique({
          where: { key: profile.key },
          select: {
            id: true,
            permissions: {
              select: { id: true },
            },
          },
        });

        if (!existingProfile) {
          const savedProfile = await tx.accessProfile.create({
            data: {
              key: profile.key,
              name: profile.label,
              description: `Perfil padrao sincronizado a partir do role ${profile.key}.`,
              isSystem: true,
              isActive: true,
            },
            select: { id: true },
          });

          const permissions = await tx.permission.findMany({
            where: { key: { in: profile.permissions as string[] } },
            select: { id: true },
          });

          if (permissions.length > 0) {
            await tx.accessProfilePermission.createMany({
              data: permissions.map((permission) => ({
                profileId: savedProfile.id,
                permissionId: permission.id,
              })),
              skipDuplicates: true,
            });
          }
          continue;
        }

        await tx.accessProfile.update({
          where: { id: existingProfile.id },
          data: {
            isSystem: true,
            isActive: true,
          },
        });

        if (existingProfile.permissions.length === 0) {
          const permissions = await tx.permission.findMany({
            where: { key: { in: profile.permissions as string[] } },
            select: { id: true },
          });

          if (permissions.length > 0) {
            await tx.accessProfilePermission.createMany({
              data: permissions.map((permission) => ({
                profileId: existingProfile.id,
                permissionId: permission.id,
              })),
              skipDuplicates: true,
            });
          }
        }
      }
    });
  }

  private async getFallbackPermissionsForProfileKey(profileKey: SettingsProfileKey): Promise<SettingsPermissionKey[]> {
    const profile = await this.prisma.accessProfile.findUnique({
      where: { key: profileKey },
      select: {
        permissions: {
          select: {
            permission: {
              select: { key: true },
            },
          },
        },
      },
    });

    return profile?.permissions.map((item) => item.permission.key as SettingsPermissionKey) ?? [];
  }

  private toHeaders(rawHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!rawHeaders) return headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (!value) continue;
      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    return headers;
  }

  private async getPermissionAssignments(userId: string): Promise<PermissionAssignment[]> {
    const assignments = await this.prisma.userAccessProfile.findMany({
      where: {
        userId,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        profile: { isActive: true },
      },
      select: {
        scopeType: true,
        companyId: true,
        profile: {
          select: {
            permissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });

    return assignments.map((assignment) => ({
      scopeType: assignment.scopeType,
      companyId: assignment.companyId,
      permissionKeys: assignment.profile.permissions.map(
        (profilePermission) => profilePermission.permission.key as SettingsPermissionKey,
      ),
    }));
  }

  private async replaceProfilePermissions(
    tx: Prisma.TransactionClient,
    profileId: string,
    permissionKeys: SettingsPermissionKey[],
  ) {
    const permissions = await tx.permission.findMany({
      where: { key: { in: permissionKeys as string[] } },
      select: { id: true },
    });

    await tx.accessProfilePermission.deleteMany({
      where: { profileId },
    });

    if (permissions.length > 0) {
      await tx.accessProfilePermission.createMany({
        data: permissions.map((permission: { id: string }) => ({
          profileId,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }
}
