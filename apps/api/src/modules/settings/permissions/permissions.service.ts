import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import {
  SETTING_KEYS,
  type SettingsPermissionsCatalogResponse,
  type SettingsPermissionsMutationResponse,
} from '@dosc-syspro/contracts';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { buildDefaultPermissionProfiles, SETTINGS_PERMISSION_DEFINITIONS } from './permissions.catalog';

const SETTINGS_WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

@Injectable()
export class SettingsPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async getCatalog(rawHeaders?: IncomingHttpHeaders): Promise<SettingsPermissionsCatalogResponse> {
    await this.requireSettingsAccess(rawHeaders);

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
      select: { value: true },
    });

    return {
      success: true,
      data: {
        matrixEnabled: setting?.value !== 'false',
        permissions: [...SETTINGS_PERMISSION_DEFINITIONS],
        profiles: buildDefaultPermissionProfiles(),
      },
    };
  }

  async updateMatrixVisibility(enabled: boolean, rawHeaders?: IncomingHttpHeaders): Promise<SettingsPermissionsMutationResponse> {
    await this.requireSettingsAccess(rawHeaders);

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
      update: { value: String(enabled) },
      create: {
        key: SETTING_KEYS.RBAC_MATRIX_ENABLED,
        value: String(enabled),
        description: 'Visibilidade da matriz RBAC',
      },
    });

    return {
      success: true,
      message: enabled ? 'Matriz RBAC ativada.' : 'Matriz RBAC desativada.',
    };
  }

  private async requireSettingsAccess(rawHeaders?: IncomingHttpHeaders) {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive || !SETTINGS_WRITE_ROLES.includes(requester.role)) {
      throw new UnauthorizedException('Sem permissao para acessar configuracoes.');
    }
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
