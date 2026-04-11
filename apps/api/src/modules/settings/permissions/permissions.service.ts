import { Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import {
  SETTING_KEYS,
  type SettingsPermissionsCatalogResponse,
  type SettingsPermissionsMutationResponse,
} from '@dosc-syspro/contracts';
import { AuthorizationService } from '../../authorization/authorization.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SettingsPermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getCatalog(rawHeaders?: IncomingHttpHeaders): Promise<SettingsPermissionsCatalogResponse> {
    await this.authorizationService.assertPermission(rawHeaders, 'settings:edit');

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
      select: { value: true },
    });

    const catalog = await this.authorizationService.getPermissionsCatalog();

    return {
      success: true,
      data: {
        matrixEnabled: setting?.value !== 'false',
        permissions: catalog.permissions,
        profiles: catalog.profiles,
      },
    };
  }

  async updateMatrixVisibility(enabled: boolean, rawHeaders?: IncomingHttpHeaders): Promise<SettingsPermissionsMutationResponse> {
    await this.authorizationService.assertPermission(rawHeaders, 'settings:edit');

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
}
