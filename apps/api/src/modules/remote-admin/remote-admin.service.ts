import { ForbiddenException, HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { hashAddressBookToken, prisma } from '@dosc-syspro/database';
import { ApiError, callProcedure, createApiContext, remoteRouter } from '@dosc-syspro/application';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  getRemoteHostDetails,
  getRemotePlatformDirectory,
  getRemotePlatformOverview,
} from './support/queries';
import { getRemoteEfficiencyMetrics } from './support/report-queries';
import { cleanupExpiredRemoteSessions, getRemoteSessions } from './support/session-queries';
import type { RemoteSessionStatus, RemoteTenantScope } from './support/model';

type HostRemoteAction = 'REBOOTSTRAP' | 'RESEND_CONFIG' | 'REAPPLY_ALIAS';
type RemoteProcedure =
  | 'sessionsList'
  | 'sessionsCreate'
  | 'sessionsStart'
  | 'sessionsStop'
  | 'linkDiscoveredHost'
  | 'hostsCreate'
  | 'hostsUpdate'
  | 'hostsDelete'
  | 'hostsRotateAgentToken'
  | 'hostsRevokeAgentToken'
  | 'hostsRelinkSysproUpdate'
  | 'addressBookList'
  | 'addressBookCredentialsList'
  | 'addressBookCredentialsCreate'
  | 'addressBookCredentialsRotate'
  | 'addressBookCredentialsRevoke';

const DEFAULT_INSTALLATION_DIRECTORY = 'C:\\Syspro\\Server\\SysproServer.exe';

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

  async searchRemoteCompanies(query: string, rawHeaders?: Record<string, unknown>) {
    await this.authorizationService.getRequester(rawHeaders as any);
    const tenantScope = await this.resolveTenantScope(rawHeaders);
    const companyWhere = tenantScope.isGlobalView
      ? { deletedAt: null, ...buildCompanySearchWhere(query) }
      : {
          deletedAt: null,
          id: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ['__none__'] },
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
      where: tenantScope.isGlobalView
        ? { id: hostId }
        : { id: hostId, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ['__none__'] } },
      select: { id: true },
    });

    if (!host) {
      throw new ForbiddenException('Host remoto nao encontrado no escopo.');
    }

    if (!tenantScope.isGlobalView && !tenantScope.companyIds.includes(companyId)) {
      throw new ForbiddenException('Empresa nao encontrada no escopo para vinculacao.');
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
    });

    if (!company) {
      throw new ForbiddenException('Empresa nao encontrada no escopo para vinculacao.');
    }

    const companyLabel = company.nomeFantasia?.trim() || company.razaoSocial.trim();
    const now = new Date();
    const existing = await prisma.remoteHostSysproUpdate.findFirst({
      where: {
        hostId,
        path,
        OR: [{ companyId }, { companyLabel }],
      },
      select: { id: true },
    });

    const update = existing
      ? await prisma.remoteHostSysproUpdate.update({
          where: { id: existing.id },
          data: {
            companyId,
            companyLabel,
            path,
            lastHeartbeatAt: now,
          },
        })
      : await prisma.remoteHostSysproUpdate.create({
          data: {
            hostId,
            companyId,
            companyLabel,
            path,
            lastHeartbeatAt: now,
          },
        });

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

  private async callRemoteProcedure(procedure: RemoteProcedure, payload: unknown, rawHeaders?: Record<string, unknown>) {
    const requester = await this.authorizationService.assertPermission(rawHeaders as any, 'tools:all');
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

    if (procedure === 'hostsDelete') {
      return { success: true };
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
    procedure: RemoteProcedure,
    payload: unknown,
    requester: { userId: string; role: Role },
    tenantScope: RemoteTenantScope,
  ) {
    const ctx = createApiContext({
      session: {
        userId: requester.userId,
        role: requester.role,
        companyIds: tenantScope.companyIds,
      },
      logger: {
        info: (event, meta) => this.logger.log({ event, ...(meta ?? {}) }),
        warn: (event, meta) => this.logger.warn({ event, ...(meta ?? {}) }),
        error: (event, meta) => this.logger.error({ event, ...(meta ?? {}) }),
      },
    });

    try {
      return await callProcedure({
        ctx,
        namespace: 'remote',
        router: remoteRouter,
        procedure,
        input: { payload },
      });
    } catch (error) {
      this.throwRemoteProcedureError(error);
    }
  }

  private throwRemoteProcedureError(error: unknown): never {
    if (error instanceof ApiError) {
      const remote = this.extractRemoteError(error.cause);
      if (remote) {
        throw new HttpException(
          {
            success: false,
            error: remote.message,
            message: remote.message,
            code: remote.code,
            httpStatus: remote.httpStatus,
            ...(remote.data !== undefined ? { data: remote.data } : {}),
          },
          remote.httpStatus,
        );
      }

      const status =
        error.code === 'UNAUTHORIZED'
          ? 401
          : error.code === 'FORBIDDEN'
            ? 403
            : error.code === 'BAD_REQUEST'
              ? 400
              : 500;
      throw new HttpException(
        {
          success: false,
          error: error.message,
          message: error.message,
          code: error.code,
          httpStatus: status,
        },
        status,
      );
    }

    throw new HttpException(
      {
        success: false,
        error: 'Falha inesperada no modulo remoto.',
        message: 'Falha inesperada no modulo remoto.',
        code: 'INTERNAL_ERROR',
        httpStatus: 500,
      },
      500,
    );
  }

  private extractRemoteError(cause: unknown) {
    if (!cause || typeof cause !== 'object') return null;
    const remote = (cause as { remote?: unknown }).remote;
    if (!remote || typeof remote !== 'object') return null;
    const candidate = remote as { code?: unknown; message?: unknown; httpStatus?: unknown; data?: unknown };
    if (
      typeof candidate.code !== 'string' ||
      typeof candidate.message !== 'string' ||
      typeof candidate.httpStatus !== 'number'
    ) {
      return null;
    }
    return candidate as { code: string; message: string; httpStatus: number; data?: unknown };
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
}
