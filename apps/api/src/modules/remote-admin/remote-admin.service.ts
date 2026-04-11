import { Injectable, ForbiddenException } from '@nestjs/common';
import { Prisma, type Role } from '@prisma/client';
import { prisma } from '@dosc-syspro/database';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  getRemoteHostDetails,
  getRemotePlatformDirectory,
  getRemotePlatformOverview,
} from './support/queries';
import { getRemoteEfficiencyMetrics } from './support/report-queries';
import { getRemoteSessions } from './support/session-queries';
import type { RemoteSessionStatus, RemoteTenantScope } from './support/model';

type HostRemoteAction = 'REBOOTSTRAP' | 'RESEND_CONFIG' | 'REAPPLY_ALIAS';

const DEFAULT_INSTALLATION_DIRECTORY = 'C:\\Syspro\\Server\\SysproServer.exe';

@Injectable()
export class RemoteAdminService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async resolveTenantScope(rawHeaders?: Record<string, unknown>): Promise<RemoteTenantScope> {
    const requester = await this.authorizationService.getRequester(rawHeaders as any);
    const companyScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'companies:view_own',
      'companies:view_all',
    );

    const role = requester.role as Role;
    const normalizedRole =
      role === 'ADMIN' ? 'ADMIN' : role === 'SUPORTE' ? 'SUPORTE' : role === 'DEVELOPER' ? 'DEVELOPER' : 'CLIENTE_ADMIN';

    return companyScope.isGlobal
      ? {
          role: normalizedRole,
          isGlobalView: true,
          companyIds: [],
          companyCount: 0,
          summary: 'Visao global liberada para operacao tecnica.',
        }
      : {
          role: 'CLIENTE_ADMIN',
          isGlobalView: false,
          companyIds: companyScope.companyIds,
          companyCount: companyScope.companyIds.length,
          summary: companyScope.companyIds.length
            ? `Escopo restrito a ${companyScope.companyIds.length} empresa(s) vinculada(s) ao usuario.`
            : 'Nenhuma empresa vinculada para escopo remoto.',
        };
  }

  async getDirectory(rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemotePlatformDirectory(tenantScope);
  }

  async getOverview(rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemotePlatformOverview(tenantScope);
  }

  async getHostDetails(hostId: string, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemoteHostDetails(tenantScope, hostId);
  }

  async getSessions(
    rawHeaders?: Record<string, unknown>,
    options?: {
      status?: RemoteSessionStatus | 'ACTIVE';
      hostId?: string;
      ticket?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemoteSessions(tenantScope, options);
  }

  async getEfficiencyMetrics(rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemoteEfficiencyMetrics(tenantScope);
  }

  async getFleetStats(rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [totalHosts, activeHosts, offlineHostsCount, pendingDiscovered, allMetrics] = await Promise.all([
      prisma.remoteHost.count(),
      prisma.remoteHost.count({ where: { status: 'ACTIVE' } }),
      prisma.remoteHost.count({
        where: {
          status: 'ACTIVE',
          OR: [{ lastHeartbeatAt: { lt: oneHourAgo } }, { lastHeartbeatAt: null }],
        },
      }),
      prisma.remoteDiscoveredHost.count({ where: { status: 'PENDING_LINK' } }),
      prisma.remoteHost.findMany({
        where: { lastAgentMetrics: { not: Prisma.DbNull } },
        select: { lastAgentMetrics: true },
      }),
    ]);

    let lowDiskCount = 0;
    const tenGb = 10 * 1024 * 1024 * 1024;
    for (const host of allMetrics) {
      const metrics = host.lastAgentMetrics as Record<string, unknown> | null;
      const diskFree = metrics?.diskFree;
      if (typeof diskFree === 'number' && diskFree < tenGb) {
        lowDiskCount++;
      }
    }

    return {
      success: true,
      data: {
        summary: {
          total: totalHosts,
          active: activeHosts,
          offline: offlineHostsCount,
          pendingLink: pendingDiscovered,
          lowDisk: lowDiskCount,
        },
        timestamp: now.toISOString(),
      },
    };
  }

  async updateCompanyContext(
    companyId: string,
    body: {
      serverType?: 'SYSPRO_SERVER' | 'IIS' | null;
      installationDirectory?: string | null;
      serverHost?: string | null;
      serverPort?: number | string | null;
      serverProtocol?: 'HTTP' | 'HTTPS' | null;
      iisIsapiPath?: string | null;
      observacoes?: string | null;
    },
    rawHeaders?: Record<string, unknown>,
  ) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const scopedWhere = tenantScope.isGlobalView ? {} : { id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ['__none__'] } };

    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null, ...scopedWhere },
      select: { id: true },
    });

    if (!company) {
      throw new ForbiddenException('Empresa nao encontrada.');
    }

    const serverPortValue =
      body.serverPort === null || body.serverPort === undefined || body.serverPort === '' ? null : Number(body.serverPort);

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        serverType: body.serverType ?? undefined,
        installationDirectory: body.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY,
        serverHost: body.serverHost?.trim() || 'localhost',
        serverPort: serverPortValue ?? undefined,
        serverProtocol: body.serverProtocol ?? undefined,
        iisIsapiPath: body.iisIsapiPath?.trim() || null,
        observacoes: body.observacoes?.trim() || null,
      },
      select: {
        id: true,
        serverType: true,
        installationDirectory: true,
        serverHost: true,
        serverPort: true,
        serverProtocol: true,
        iisIsapiPath: true,
        observacoes: true,
      },
    });

    return { success: true, data: updated };
  }

  async updateCompanyObservacoes(
    companyId: string,
    body: { observacoes?: string | null },
    rawHeaders?: Record<string, unknown>,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders as any);
    const canEditAll = await this.authorizationService.userHasPermission(requester, 'companies:edit');
    if (!canEditAll) {
      throw new ForbiddenException('Sem permissao para editar observacoes da empresa.');
    }

    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const scopedWhere = tenantScope.isGlobalView ? {} : { id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ['__none__'] } };

    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null, ...scopedWhere },
      select: { id: true },
    });

    if (!company) {
      throw new ForbiddenException('Empresa nao encontrada.');
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { observacoes: body.observacoes?.trim() || null },
      select: { id: true, observacoes: true },
    });

    return { success: true, data: updated };
  }

  async enqueueHostAction(
    hostId: string,
    action: HostRemoteAction,
    rawHeaders?: Record<string, unknown>,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders as any);
    const allowed = await this.authorizationService.userHasPermission(requester, 'tools:all');
    if (!allowed) {
      throw new ForbiddenException('Sem permissao para acionar comandos remotos.');
    }

    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const host = await prisma.remoteHost.findFirst({
      where: tenantScope.isGlobalView
        ? { id: hostId }
        : { id: hostId, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ['__none__'] } },
      select: { id: true, name: true },
    });

    if (!host) {
      throw new ForbiddenException('Host remoto nao encontrado no escopo.');
    }

    if (action === 'REBOOTSTRAP') {
      return {
        success: false,
        error: 'Rebootstrap permanece no runtime remoto atual e sera migrado na proxima passada.',
      };
    }

    const commandType = action === 'RESEND_CONFIG' ? 'REAPPLY_CONFIG' : 'REAPPLY_ALIAS';
    const reason =
      action === 'RESEND_CONFIG'
        ? 'Acao manual do portal: reenviar configuracao para o agente.'
        : 'Acao manual do portal: reaplicar alias no agente.';

    const existing = await prisma.remoteAgentCommand.findFirst({
      where: {
        hostId,
        type: commandType,
        status: { in: ['PENDING', 'DELIVERED'] },
      },
      orderBy: [{ createdAt: 'desc' }],
      select: { id: true, type: true, status: true, createdAt: true },
    });

    if (existing) {
      return {
        success: true,
        data: existing,
        message: 'Ja existe comando pendente deste tipo para o host.',
      };
    }

    const command = await prisma.remoteAgentCommand.create({
      data: {
        hostId,
        type: commandType,
        status: 'PENDING',
        reason,
        payload: {
          source: 'portal.manual_action',
          requestedByUserId: requester.userId,
          requestedAt: new Date().toISOString(),
          action,
        },
      },
      select: {
        id: true,
        type: true,
        status: true,
        reason: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: command,
      message: 'Comando remoto enfileirado. Aguarde ciclo de sync/ack do agente.',
    };
  }
}
