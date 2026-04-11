import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import type {
  SettingsPermissionKey,
  SettingsProfileKey,
  SettingsPermissionsCatalog,
} from '@dosc-syspro/contracts';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SETTINGS_PERMISSION_DEFINITIONS,
  buildDefaultPermissionProfiles,
  getDefaultPermissionsForProfileKey,
} from '../settings/permissions/permissions.catalog';

type Requester = {
  userId: string;
  email: string;
  role: Role;
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

  async userHasPermission(requester: Requester, permission: SettingsPermissionKey) {
    await this.syncSystemAuthorizationCatalog();

    const assignments = await this.prisma.userAccessProfile.findMany({
      where: {
        userId: requester.userId,
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

    if (assignments.length === 0) {
      return getDefaultPermissionsForProfileKey(requester.role as SettingsProfileKey).includes(permission);
    }

    return assignments.some((assignment) =>
      assignment.scopeType === 'GLOBAL' &&
      assignment.profile.permissions.some((profilePermission) => profilePermission.permission.key === permission),
    );
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
        const savedProfile = await tx.accessProfile.upsert({
          where: { key: profile.key },
          update: {
            name: profile.label,
            isSystem: true,
            isActive: true,
          },
          create: {
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

        await tx.accessProfilePermission.deleteMany({
          where: { profileId: savedProfile.id },
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
      }
    });
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
}
