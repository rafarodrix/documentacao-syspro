import { BadRequestException, ForbiddenException, HttpException, Injectable, Logger } from '@nestjs/common';
import { ErpProtocol, ErpRuntimeType, Prisma, Role } from '@prisma/client';
import { hashAddressBookToken, prisma } from '@dosc-syspro/database';
import { resolveScopedCompanyContext } from '@dosc-syspro/remote-infra';
import { AuthorizationService } from '../authorization/authorization.service';
import { executeRemoteAdminProcedure, type RemoteAdminProcedure } from './remote-procedure-runner';
import {
  getRemoteDiscoveredHostDetails,
  getRemoteHostDetails,
  getRemoteHostCriticalEvents,
  getRemotePlatformDirectory,
  getRemotePlatformOverview,
  getRemoteDevicesPaginated,
} from './support/remote-host.queries';
import type { DeviceListQueryParams } from '@dosc-syspro/contracts';
import { getRemoteEfficiencyMetrics } from './support/report-queries';
import { cleanupExpiredRemoteSessions, getRemoteSessions } from './support/session-queries';
import { buildScopedCompanyWhere, buildScopedHostWhere } from './support/scope';
import type { RemoteSessionStatus, RemoteTenantScope } from './support/remote-admin.types';

type HostRemoteAction = 'REBOOTSTRAP' | 'RESEND_CONFIG' | 'REAPPLY_ALIAS' | 'UPGRADE_CLIENT' | 'UPGRADE_RUSTDESK' | 'UPGRADE_AGENT';
const DEFAULT_INSTALLATION_DIRECTORY = 'C:\\Syspro\\Server\\SysproServer.exe';
const AGENT_UPDATE_MANIFEST_URL = 'https://ajuda.trilinksoftware.com.br/agent/manifest.json';
const AGENT_UPDATE_TARGET_VERSION = '1.0.88';

function supportsManagedAgentUpgrade(agentVersion: string | null) {
  const match = agentVersion?.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;

  const [, major, minor, patch] = match.map(Number);
  return major > 1 || (major === 1 && (minor > 0 || (minor === 0 && patch >= 85)));
}

function normalizeCompanyOptionLabel(input: { nomeFantasia: string | null; razaoSocial: string }) {
  const nomeFantasia = input.nomeFantasia?.trim() ?? '';
  const razaoSocial = input.razaoSocial.trim();

  if (!nomeFantasia) return razaoSocial;
  if (nomeFantasia.localeCompare(razaoSocial, 'pt-BR', { sensitivity: 'base' }) === 0) return nomeFantasia;
  return `${nomeFantasia} | ${razaoSocial}`;
}

function buildCompanySearchWhere(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return {};

  return {
    OR: [
      { nomeFantasia: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
      { razaoSocial: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
    ],
  };
}

@Injectable()
export class RemoteAdminService {
  private readonly logger = new Logger(RemoteAdminService.name);

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

  async getDevices(params: DeviceListQueryParams, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemoteDevicesPaginated(tenantScope, params);
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

  async getHostCriticalEvents(hostId: string, query: { cursor?: string; limit?: number; severity?: string; provider?: string }, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    return getRemoteHostCriticalEvents(await this.resolveTenantScope(rawHeaders), hostId, query);
  }

  async getDiscoveredHostDetails(discoveredHostId: string, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    return getRemoteDiscoveredHostDetails(tenantScope, discoveredHostId);
  }

  async searchRemoteCompanies(query: string, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const companyWhere = {
      deletedAt: null,
      ...buildScopedCompanyWhere(tenantScope),
      ...buildCompanySearchWhere(query),
    };

    const companies = await prisma.company.findMany({
      where: companyWhere,
      select: {
        id: true,
        nomeFantasia: true,
        razaoSocial: true,
      },
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
      take: 50,
    });

    return {
      success: true,
      data: {
        options: companies.map((company) => ({
          id: company.id,
          label: normalizeCompanyOptionLabel(company),
          searchText: `${company.nomeFantasia?.trim() ?? ''} ${company.razaoSocial.trim()}`.trim(),
        })),
      },
    };
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
    await this.resolveCompanyContextForRemoteAdmin(tenantScope, companyId, 'Empresa nao encontrada.');

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
    await this.resolveCompanyContextForRemoteAdmin(tenantScope, companyId, 'Empresa nao encontrada.');

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
      where: buildScopedHostWhere(tenantScope, hostId),
      select: { id: true, name: true, agentVersion: true },
    });

    if (!host) {
      throw new ForbiddenException('Host remoto nao encontrado no escopo.');
    }

    if (action === 'UPGRADE_AGENT' && !supportsManagedAgentUpgrade(host.agentVersion)) {
      throw new BadRequestException('Este host ainda usa um agente legado. Atualize-o uma vez pelo instalador ou agent-updater antes de usar o upgrade gerenciado pelo portal.');
    }

    if (action === 'REBOOTSTRAP') {
      const result = await this.executeRemoteProcedure('hostsRotateAgentToken', { hostId }, requester, tenantScope);
      if (result && typeof result === 'object' && 'host' in result) {
        const message = 'message' in result ? (result as { message?: unknown }).message : undefined;
        return {
          success: true,
          data: (result as { host: unknown }).host,
          message: message ?? 'Rebootstrap solicitado com sucesso.',
        };
      }

      return {
        success: true,
        data: result,
        message: 'Rebootstrap solicitado com sucesso.',
      };
    }

    const commandType =
      action === 'RESEND_CONFIG'
        ? 'REAPPLY_CONFIG'
        : action === 'UPGRADE_AGENT'
          ? 'UPGRADE_AGENT'
          : action === 'UPGRADE_RUSTDESK' || action === 'UPGRADE_CLIENT'
            ? 'UPGRADE_CLIENT'
          : 'REAPPLY_ALIAS';
    const reason =
      action === 'RESEND_CONFIG'
        ? 'Acao manual do portal: reenviar configuracao para o agente.'
        : action === 'UPGRADE_AGENT'
          ? 'Acao manual do portal: solicitar upgrade incremental do agente.'
          : action === 'UPGRADE_RUSTDESK' || action === 'UPGRADE_CLIENT'
            ? 'Acao manual do portal: solicitar upgrade do RustDesk.'
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
          ...(action === 'UPGRADE_AGENT' ? { manifestUrl: AGENT_UPDATE_MANIFEST_URL, targetVersion: AGENT_UPDATE_TARGET_VERSION } : {}),
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

  async enqueueServiceControl(
    hostId: string,
    serviceName: string,
    serviceAction: 'start' | 'stop' | 'restart',
    rawHeaders?: Record<string, unknown>,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders as any);
    const allowed = await this.authorizationService.userHasPermission(requester, 'tools:all');
    if (!allowed) {
      throw new ForbiddenException('Sem permissao para controlar servicos remotos.');
    }

    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const host = await prisma.remoteHost.findFirst({
      where: buildScopedHostWhere(tenantScope, hostId),
      select: { id: true, name: true },
    });

    if (!host) {
      throw new ForbiddenException('Host remoto nao encontrado no escopo.');
    }

    const command = await prisma.remoteAgentCommand.create({
      data: {
        hostId,
        type: 'SERVICE_CONTROL',
        status: 'PENDING',
        reason: `Acao manual do portal: ${serviceAction} servico ${serviceName}.`,
        payload: {
          source: 'portal.service_control',
          requestedByUserId: requester.userId,
          requestedAt: new Date().toISOString(),
          serviceName,
          action: serviceAction,
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
      message: `Comando ${serviceAction} para ${serviceName} enfileirado. Aguarde ciclo de sync/ack.`,
    };
  }

  listRemoteSessions(rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('sessionsList', {}, rawHeaders);
  }

  createRemoteSession(body: unknown, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('sessionsCreate', body, rawHeaders);
  }

  startRemoteSession(sessionId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('sessionsStart', { sessionId }, rawHeaders);
  }

  stopRemoteSession(sessionId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('sessionsStop', { sessionId }, rawHeaders);
  }

  linkDiscoveredHost(discoveredHostId: string, body: unknown, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('linkDiscoveredHost', { ...this.asObject(body), discoveredHostId }, rawHeaders);
  }

  ignoreDiscoveredHost(discoveredHostId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('ignoreDiscoveredHost', { discoveredHostId }, rawHeaders);
  }

  reactivateDiscoveredHost(discoveredHostId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('reactivateDiscoveredHost', { discoveredHostId }, rawHeaders);
  }

  createRemoteHost(body: unknown, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('hostsCreate', body, rawHeaders);
  }

  updateRemoteHost(hostId: string, body: unknown, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('hostsUpdate', { ...this.asObject(body), hostId }, rawHeaders);
  }

  deleteRemoteHost(hostId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('hostsDelete', { hostId }, rawHeaders);
  }

  rotateRemoteHostAgentToken(hostId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('hostsRotateAgentToken', { hostId }, rawHeaders);
  }

  revokeRemoteHostAgentToken(hostId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('hostsRevokeAgentToken', { hostId }, rawHeaders);
  }

  async updateErpInstallationRuntime(hostId: string, installationId: string, body: unknown, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'remote:manage');
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const payload = this.asObject(body);
    const runtimeType: ErpRuntimeType | null = payload.runtimeType === 'SYSPRO_SERVER' || payload.runtimeType === 'IIS' ? payload.runtimeType : null;
    const protocol: ErpProtocol | null = payload.protocol === 'HTTP' || payload.protocol === 'HTTPS' || payload.protocol === 'TCP' ? payload.protocol : null;
    const configuredPort = typeof payload.configuredPort === 'number' && Number.isInteger(payload.configuredPort) ? payload.configuredPort : null;
    if (configuredPort !== null && (configuredPort < 1 || configuredPort > 65535)) throw new BadRequestException('A porta deve estar entre 1 e 65535.');

    const installation = await prisma.erpInstallation.findFirst({
      where: { id: installationId, deviceId: hostId, host: buildScopedHostWhere(tenantScope, hostId) },
      select: { id: true, deviceId: true },
    });
    if (!installation) throw new ForbiddenException('Instalação ERP não encontrada no escopo.');

    const conflict = configuredPort === null ? null : await prisma.erpInstallation.findFirst({
      where: { deviceId: hostId, configuredPort, id: { not: installationId } },
      select: { rootPath: true },
    });
    const data = conflict
      ? { runtimeType, protocol, hostName: typeof payload.hostName === 'string' ? payload.hostName.trim() || null : null, requestedPort: configuredPort, runtimeSource: 'MANUAL' as const, runtimeStatus: 'PORT_CONFLICT' as const }
      : { runtimeType, protocol, hostName: typeof payload.hostName === 'string' ? payload.hostName.trim() || null : null, configuredPort, requestedPort: null, runtimeSource: runtimeType || configuredPort ? 'MANUAL' as const : null, runtimeStatus: runtimeType && configuredPort ? 'CONFIGURED' as const : 'PENDING_CONFIGURATION' as const };
    const saved = await prisma.erpInstallation.update({ where: { id: installationId }, data });
    return { success: !conflict, data: saved, error: conflict ? `A porta ${configuredPort} já está configurada em ${conflict.rootPath}.` : null };
  }

  async createManualRemoteHostSysproUpdate(
    hostId: string,
    body: unknown,
    rawHeaders?: Record<string, unknown>,
  ) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const payload = this.asObject(body);
    const companyId = typeof payload.companyId === 'string' ? payload.companyId.trim() : '';
    const rawPath = typeof payload.path === 'string' ? payload.path.trim() : '';
    const path = rawPath || DEFAULT_INSTALLATION_DIRECTORY;

    if (!companyId) {
      throw new HttpException('Selecione a empresa da instalacao.', 400);
    }

    const host = await prisma.remoteHost.findFirst({
      where: buildScopedHostWhere(tenantScope, hostId),
      select: { id: true },
    });

    if (!host) {
      throw new ForbiddenException('Host remoto nao encontrado no escopo.');
    }

    const company = await this.resolveRemoteCompanyContext(tenantScope, companyId);
    const companyLabel = company.displayLabel;
    const now = new Date();
    const existing = await prisma.remoteHostSysproUpdate.findFirst({
      where: {
        hostId,
        path,
        companyId,
      },
      select: { id: true },
    });

    let update;
    if (existing) {
      update = await prisma.remoteHostSysproUpdate.update({
        where: { id: existing.id },
        data: {
          companyId,
          companyLabel,
          path,
          lastHeartbeatAt: now,
        },
      });
    } else {
      try {
        update = await prisma.remoteHostSysproUpdate.create({
          data: {
            hostId,
            companyId,
            companyLabel,
            path,
            lastHeartbeatAt: now,
          },
        });
      } catch (error) {
        const isUniqueViolation =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002';

        if (!isUniqueViolation) {
          throw error;
        }

        const duplicated = await prisma.remoteHostSysproUpdate.findFirst({
          where: {
            hostId,
            companyId,
            path,
          },
        });

        if (!duplicated) {
          throw error;
        }

        update = await prisma.remoteHostSysproUpdate.update({
          where: { id: duplicated.id },
          data: {
            companyLabel,
            lastHeartbeatAt: now,
          },
        });
      }
    }

    return {
      success: true,
      data: {
        id: update.id,
        companyId: update.companyId,
        companyLabel: update.companyLabel,
        path: update.path,
      },
      message: 'Instalacao cadastrada manualmente com sucesso.',
    };
  }

  relinkRemoteHostSysproUpdate(
    hostId: string,
    updateId: string,
    body: unknown,
    rawHeaders?: Record<string, unknown>,
  ) {
    return this.callRemoteProcedure('hostsRelinkSysproUpdate', { ...this.asObject(body), hostId, updateId }, rawHeaders);
  }

  async cleanupRemoteSessions(rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    const result = await cleanupExpiredRemoteSessions();
    return { success: true, data: result };
  }

  async listRemoteAddressBook(rawHeaders?: Record<string, unknown>) {
    const credential = await this.resolveAddressBookCredential(rawHeaders);
    if (credential) {
      const result = await this.executeRemoteProcedure(
        'addressBookList',
        {},
        {
          userId: credential.id,
          role: credential.scope === 'GLOBAL' ? Role.ADMIN : Role.CLIENTE_USER,
        },
        credential.scope === 'GLOBAL'
          ? {
              role: 'ADMIN',
              isGlobalView: true,
              companyIds: [],
              companyCount: 0,
              summary: 'Escopo global por credencial de address book.',
            }
          : {
              role: 'CLIENTE_ADMIN',
              isGlobalView: false,
              companyIds: credential.companyId ? [credential.companyId] : [],
              companyCount: credential.companyId ? 1 : 0,
              summary: 'Escopo por empresa via credencial de address book.',
            },
      );
      return this.normalizeAddressBookResult(result);
    }

    const requester = await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const result = await this.executeRemoteProcedure('addressBookList', {}, requester, tenantScope);
    return this.normalizeAddressBookResult(result);
  }

  listAddressBookCredentials(rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('addressBookCredentialsList', {}, rawHeaders);
  }

  createAddressBookCredential(body: unknown, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('addressBookCredentialsCreate', body, rawHeaders);
  }

  rotateAddressBookCredential(credentialId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('addressBookCredentialsRotate', { credentialId }, rawHeaders);
  }

  revokeAddressBookCredential(credentialId: string, rawHeaders?: Record<string, unknown>) {
    return this.callRemoteProcedure('addressBookCredentialsRevoke', { credentialId }, rawHeaders);
  }

  private async callRemoteProcedure(procedure: RemoteAdminProcedure, payload: unknown, rawHeaders?: Record<string, unknown>) {
    const requester = await this.assertRemoteAdminPermission(rawHeaders, procedure);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const result = await this.executeRemoteProcedure(procedure, payload, requester, tenantScope);

    if (
      procedure === 'sessionsList' &&
      result &&
      typeof result === 'object' &&
      'sessions' in result &&
      Array.isArray((result as { sessions?: unknown }).sessions)
    ) {
      return { success: true, data: (result as { sessions: unknown[] }).sessions, tenantScope };
    }

    if (
      (procedure === 'sessionsCreate' || procedure === 'sessionsStart' || procedure === 'sessionsStop') &&
      result &&
      typeof result === 'object' &&
      'session' in result
    ) {
      return { success: true, data: (result as { session: unknown }).session };
    }

    if (
      procedure === 'hostsDelete' ||
      procedure === 'ignoreDiscoveredHost' ||
      procedure === 'reactivateDiscoveredHost'
    ) {
      return {
        success: true,
        ...(
          (procedure === 'ignoreDiscoveredHost' || procedure === 'reactivateDiscoveredHost') &&
          result &&
          typeof result === 'object'
            ? { data: result }
            : {}
        ),
      };
    }

    if (procedure === 'linkDiscoveredHost') {
      return { success: true, data: result };
    }

    if (
      (procedure === 'hostsCreate' ||
        procedure === 'hostsUpdate' ||
        procedure === 'hostsRotateAgentToken' ||
        procedure === 'hostsRevokeAgentToken') &&
      result &&
      typeof result === 'object' &&
      'host' in result
    ) {
      const message = 'message' in result ? (result as { message?: unknown }).message : undefined;
      return { success: true, data: (result as { host: unknown }).host, ...(message ? { message } : {}) };
    }

    if (procedure === 'hostsRelinkSysproUpdate' && result && typeof result === 'object' && 'update' in result) {
      return { success: true, data: (result as { update: unknown }).update };
    }

    if (procedure === 'addressBookCredentialsList' && result && typeof result === 'object' && 'credentials' in result) {
      return { success: true, data: (result as { credentials: unknown }).credentials };
    }

    if (
      (procedure === 'addressBookCredentialsCreate' || procedure === 'addressBookCredentialsRotate') &&
      result &&
      typeof result === 'object' &&
      'credential' in result
    ) {
      return {
        success: true,
        message: procedure === 'addressBookCredentialsCreate' ? 'Credencial criada.' : 'Credencial rotacionada.',
        data: (result as { credential: unknown }).credential,
      };
    }

    if (procedure === 'addressBookCredentialsRevoke' && result && typeof result === 'object' && 'message' in result) {
      return { success: true, message: (result as { message: unknown }).message };
    }

    return { success: true, data: result };
  }

  private async executeRemoteProcedure(
    procedure: RemoteAdminProcedure,
    payload: unknown,
    requester: { userId: string; role: Role },
    tenantScope: RemoteTenantScope,
  ) {
    return executeRemoteAdminProcedure({
      procedure,
      payload,
      requester: {
        userId: requester.userId,
        role: requester.role,
      },
      scope: {
        isGlobalView: tenantScope.isGlobalView,
        companyIds: tenantScope.companyIds,
      },
      logger: {
        info: (event: string, meta?: Record<string, unknown>) => this.logger.log({ event, ...(meta ?? {}) }),
        warn: (event: string, meta?: Record<string, unknown>) => this.logger.warn({ event, ...(meta ?? {}) }),
        error: (event: string, meta?: Record<string, unknown>) => this.logger.error({ event, ...(meta ?? {}) }),
      },
    });
  }

  private async assertRemoteAdminPermission(rawHeaders: Record<string, unknown> | undefined, procedure: RemoteAdminProcedure) {
    if (procedure.startsWith('addressBook')) {
      return this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
    }

    try {
      return await this.authorizationService.assertPermission(rawHeaders as any, 'remote:manage');
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
      }
      throw error;
    }
  }

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private normalizeAddressBookResult(result: unknown) {
    if (result && typeof result === 'object' && 'items' in result && 'total' in result) {
      return {
        success: true,
        data: {
          items: (result as { items: unknown }).items,
          total: (result as { total: unknown }).total,
        },
      };
    }

    return { success: true, data: result };
  }

  private async resolveAddressBookCredential(rawHeaders?: Record<string, unknown>) {
    const authorization = this.getHeader(rawHeaders, 'authorization');
    if (!authorization?.toLowerCase().startsWith('bearer ')) return null;

    const token = authorization.slice('bearer '.length).trim();
    if (!token) return null;

    const now = new Date();
    const credential = await prisma.remoteAddressBookCredential.findFirst({
      where: {
        tokenHash: hashAddressBookToken(token),
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true,
        scope: true,
        companyId: true,
      },
    });

    if (!credential) return null;

    await prisma.remoteAddressBookCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: now },
    });

    return credential;
  }

  private getHeader(rawHeaders: Record<string, unknown> | undefined, name: string) {
    const value = rawHeaders?.[name.toLowerCase()];
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0].trim() : null;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private async resolveRemoteCompanyContext(
    tenantScope: RemoteTenantScope,
    companyId: string,
  ) {
    return this.resolveCompanyContextForRemoteAdmin(
      tenantScope,
      companyId,
      'Empresa nao encontrada no escopo para vinculacao.',
    );
  }

  private async resolveCompanyContextForRemoteAdmin(
    tenantScope: RemoteTenantScope,
    companyId: string,
    notFoundMessage: string,
  ) {
    try {
      return await resolveScopedCompanyContext({
        scope: {
          isGlobalView: tenantScope.isGlobalView,
          companyIds: tenantScope.companyIds,
        },
        companyId,
      });
    } catch (error) {
      if (error instanceof Error && (error.message === 'HOST_COMPANY_OUT_OF_SCOPE' || error.message === 'HOST_COMPANY_NOT_FOUND')) {
        throw new ForbiddenException(notFoundMessage);
      }
      throw error;
    }
  }
}
