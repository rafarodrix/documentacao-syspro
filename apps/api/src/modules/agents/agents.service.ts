import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  agentDevicePatchSchema,
  agentHeartbeatPayloadSchema,
  agentRegisterPayloadSchema,
  type AgentDesiredState,
  type AgentDeviceListQuery,
  type AgentDeviceListResult,
  type AgentHostOption,
  type AgentDeviceSummary,
  type AgentFleetStats,
} from '@dosc-syspro/contracts/agent';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import { differenceInSeconds } from '@dosc-syspro/shared';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { getRemoteModuleSettingsSnapshot } from '../../common/system-settings/remote-module-settings-snapshot';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

const ONLINE_THRESHOLD_SECONDS = 5 * 60;

const DEVICE_INCLUDE = {
  company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
  remoteHost: { select: { id: true, name: true, lastHeartbeatAt: true, lastHeartbeatSuccessAt: true } },
} as const;

const DESIRED_STATE_DEVICE_INCLUDE = {
  remoteHost: {
    select: {
      id: true,
      sysproUpdates: {
        select: {
          companyId: true,
          companyLabel: true,
          path: true,
          company: { select: { nomeFantasia: true, razaoSocial: true } },
        },
        orderBy: [{ path: 'asc' }, { companyLabel: 'asc' }] as Prisma.RemoteHostSysproUpdateOrderByWithRelationInput[],
      },
    },
  },
} as const;

type DeviceRow = {
  id: string;
  deviceId: string;
  agentInstanceId: string | null;
  credentialId: string | null;
  hostname: string | null;
  os: string | null;
  identitySource: string | null;
  agentVersion: string | null;
  companyId: string | null;
  remoteHostId: string | null;
  firstSeenAt: Date;
  lastHeartbeatAt: Date | null;
  lastRegisteredAt: Date | null;
  company: {
    id: string;
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
  remoteHost: {
    id: string;
    name: string;
    lastHeartbeatAt: Date | null;
    lastHeartbeatSuccessAt: Date | null;
  } | null;
};

type AgentRemoteLinkContext = {
  remoteHostId?: string;
  companyId?: string;
  rustdeskId?: string;
};

type AgentManageScope = {
  isGlobal: boolean;
  companyIds: string[];
};

type DiscoveredHeartbeatRow = {
  machineName: string | null;
  lastHeartbeatAt: Date | null;
};

type DesiredStateDeviceRow = {
  remoteHost: {
    id: string;
    sysproUpdates: Array<{
      companyId: string | null;
      companyLabel: string;
      path: string;
      company: {
        nomeFantasia: string | null;
        razaoSocial: string;
      } | null;
    }>;
  } | null;
} | null;

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async register(internalApiKey: string | undefined, body: unknown) {
    assertInternalApiKey(internalApiKey);

    const parsed = agentRegisterPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_REGISTER_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const now = new Date();
    const remoteLinkContext = this.normalizeRemoteLinkContext(payload.remoteLinkContext);

    await this.assertDeviceNotRevoked(parsed.data.deviceId, remoteLinkContext);

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
        agentInstanceId: payload.agentInstanceId,
        credentialId: payload.credentialId,
        hostname: payload.hostname ?? null,
        os: payload.os ?? null,
        identitySource: payload.identitySource ?? null,
        agentVersion: payload.agentVersion ?? null,
        companyId: remoteLinkContext.companyId ?? null,
        firstSeenAt: now,
        lastRegisteredAt: now,
        lastHeartbeatAt: now,
      },
      update: {
        agentInstanceId: payload.agentInstanceId,
        credentialId: payload.credentialId,
        hostname: payload.hostname ?? undefined,
        os: payload.os ?? undefined,
        identitySource: payload.identitySource ?? undefined,
        agentVersion: payload.agentVersion ?? undefined,
        companyId: remoteLinkContext.companyId ?? undefined,
        lastRegisteredAt: now,
        lastHeartbeatAt: now,
      },
    });

    const registeredDevice = device as { remoteHostId?: string | null; companyId: string | null };
    if (!registeredDevice.remoteHostId) {
      await this.tryLinkRemoteHost(payload.deviceId, remoteLinkContext, registeredDevice.companyId);
    }

    this.logger.log({
      event: 'agent.registered',
      deviceId: payload.deviceId,
      agentInstanceId: payload.agentInstanceId,
      credentialId: payload.credentialId,
      hostname: payload.hostname,
      os: payload.os,
      identitySource: payload.identitySource,
      agentVersion: payload.agentVersion,
      remoteHostId: remoteLinkContext.remoteHostId,
      rustdeskId: remoteLinkContext.rustdeskId,
    });

    return {
      success: true,
      data: {
        registered: true,
        receivedAt: now.toISOString(),
        deviceId: payload.deviceId,
        agentInstanceId: payload.agentInstanceId,
      },
    };
  }

  async heartbeat(internalApiKey: string | undefined, body: unknown) {
    assertInternalApiKey(internalApiKey);

    const parsed = agentHeartbeatPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_HEARTBEAT_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const now = new Date();
    const remoteLinkContext = this.normalizeRemoteLinkContext(payload.remoteLinkContext);

    await this.assertDeviceNotRevoked(parsed.data.deviceId, remoteLinkContext);

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
        agentInstanceId: payload.agentInstanceId,
        credentialId: payload.credentialId,
        agentVersion: payload.agentVersion ?? null,
        companyId: remoteLinkContext.companyId ?? null,
        firstSeenAt: now,
        lastHeartbeatAt: now,
      },
      update: {
        agentInstanceId: payload.agentInstanceId,
        credentialId: payload.credentialId,
        agentVersion: payload.agentVersion ?? undefined,
        companyId: remoteLinkContext.companyId ?? undefined,
        lastHeartbeatAt: now,
      },
    });

    const heartbeatDevice = device as {
      remoteHostId?: string | null;
      companyId: string | null;
    };
    if (!heartbeatDevice.remoteHostId) {
      await this.tryLinkRemoteHost(payload.deviceId, remoteLinkContext, heartbeatDevice.companyId);
    }

    return {
      success: true,
      data: {
        received: true,
        receivedAt: now.toISOString(),
        deviceId: payload.deviceId,
        agentInstanceId: payload.agentInstanceId,
      },
    };
  }

  /**
   * Best-effort: bind an AgentDevice to the RemoteHost explicitly referenced
   * by the remote runtime state. We do not infer by hostname because common
   * names such as "SERVIDOR" collide across customers.
   */
  private async tryLinkRemoteHost(
    deviceId: string,
    linkContext: AgentRemoteLinkContext,
    companyId: string | null,
  ): Promise<void> {
    try {
      const effectiveCompanyId = linkContext.companyId ?? companyId ?? undefined;
      let match: { id: string; companyId: string } | null = null;

      if (linkContext.remoteHostId) {
        match = await this.prisma.remoteHost.findFirst({
          where: {
            id: linkContext.remoteHostId,
            ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
            OR: [{ agentDevice: null }, { agentDevice: { deviceId } }],
          } as any,
          select: { id: true, companyId: true },
        });
      }

      if (!match && linkContext.rustdeskId) {
        const rustdeskMatches = await this.prisma.remoteHost.findMany({
          where: {
            agentExternalId: linkContext.rustdeskId,
            ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
            OR: [{ agentDevice: null }, { agentDevice: { deviceId } }],
          } as any,
          select: { id: true, companyId: true },
          take: 2,
        });
        if (rustdeskMatches.length === 1) {
          match = rustdeskMatches[0];
        }
      }

      if (!match) return;


      const data: Record<string, unknown> = { remoteHostId: match.id };
      if (match.companyId && !companyId) {
        data.companyId = match.companyId;
      }

      await this.prisma.agentDevice.update({ where: { deviceId }, data: data as any });

      this.logger.log({
        event: 'agent.host_linked',
        deviceId,
        remoteHostId: match.id,
        rustdeskId: linkContext.rustdeskId,
        linkedBy: linkContext.remoteHostId ? 'remote_host_id' : 'rustdesk_id',
        companyIdPropagated: !!(match.companyId && !companyId),
      });
    } catch (err) {
      this.logger.warn({ event: 'agent.host_link_failed', deviceId, error: String(err) });
    }
  }

  private normalizeRemoteLinkContext(input: unknown): AgentRemoteLinkContext {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    const record = input as Record<string, unknown>;
    const remoteHostId =
      typeof record.remoteHostId === 'string' && record.remoteHostId.trim() ? record.remoteHostId.trim() : undefined;
    const companyId =
      typeof record.companyId === 'string' && record.companyId.trim() ? record.companyId.trim() : undefined;
    const rustdeskId =
      typeof record.rustdeskId === 'string' && record.rustdeskId.trim() ? record.rustdeskId.trim() : undefined;

    return { remoteHostId, companyId, rustdeskId };
  }

  async linkDevice(
    rawHeaders: Record<string, unknown> | undefined,
    deviceId: string,
    body: unknown,
  ): Promise<{ success: true; data: AgentDeviceSummary }> {
    const requester = await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');
    const scope = await this.authorizationService.resolveCompanyAccessScope(requester, 'agents:manage');

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    const parsed = agentDevicePatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_PATCH_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    let hostCompanyId: string | undefined;
    if (parsed.data.remoteHostId !== null) {
      const host = await this.prisma.remoteHost.findUnique({
        where: { id: parsed.data.remoteHostId },
        select: { id: true, companyId: true },
      });
      if (!host) {
        throw new NotFoundException({ success: false, error: 'REMOTE_HOST_NOT_FOUND' });
      }
      this.assertCompanyInScope(host.companyId, scope, 'REMOTE_HOST_OUT_OF_SCOPE');
      hostCompanyId = host.companyId;
    }

    try {
      const updateData: Prisma.AgentDeviceUncheckedUpdateInput = {
        remoteHostId: parsed.data.remoteHostId,
        ...(hostCompanyId ? { companyId: hostCompanyId } : {}),
      };
      const row = await this.prisma.agentDevice.update({
        where: { deviceId: normalizedDeviceId },
        data: updateData,
        include: DEVICE_INCLUDE,
      });
      const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

      this.logger.log({
        event: parsed.data.remoteHostId ? 'agent.host_linked_manual' : 'agent.host_unlinked_manual',
        deviceId: normalizedDeviceId,
        remoteHostId: parsed.data.remoteHostId,
      });

      return { success: true, data: this.toSummary(row, onlineSince) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException({ success: false, error: 'HOST_ALREADY_LINKED' });
        }
        if (err.code === 'P2025') {
          throw new NotFoundException({ success: false, error: 'AGENT_DEVICE_NOT_FOUND' });
        }
      }
      throw err;
    }
  }

  async listHostOptions(
    rawHeaders: Record<string, unknown> | undefined,
    query?: { search?: string },
  ): Promise<{ success: true; data: AgentHostOption[] }> {
    const requester = await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');
    const scope = await this.authorizationService.resolveCompanyAccessScope(requester, 'agents:manage');

    if (!scope.isGlobal && scope.companyIds.length === 0) {
      return { success: true, data: [] };
    }

    const search = query?.search?.trim();
    const where: Prisma.RemoteHostWhereInput = {
      ...(scope.isGlobal ? {} : { companyId: { in: scope.companyIds } }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
              { machineName: { contains: search, mode: Prisma.QueryMode.insensitive } },
              {
                company: {
                  is: {
                    OR: [
                      { nomeFantasia: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      { razaoSocial: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    ],
                  },
                },
              },
              {
                agentDevice: {
                  is: {
                    OR: [
                      { hostname: { contains: search, mode: Prisma.QueryMode.insensitive } },
                      { deviceId: { contains: search, mode: Prisma.QueryMode.insensitive } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.remoteHost.findMany({
      where,
      select: {
        id: true,
        name: true,
        companyId: true,
        status: true,
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
        agentDevice: {
          select: {
            deviceId: true,
            hostname: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
      take: 50,
    });

    return {
      success: true,
      data: rows.map((row) => ({
        id: row.id,
        name: row.name,
        companyId: row.companyId,
        companyName: row.company?.nomeFantasia?.trim() || row.company?.razaoSocial?.trim() || null,
        status: row.status,
        linkedDeviceId: row.agentDevice?.deviceId ?? null,
        linkedDeviceHostname: row.agentDevice?.hostname ?? null,
      })),
    };
  }

  async getDesiredState(internalApiKey: string | undefined, deviceId: string) {
    assertInternalApiKey(internalApiKey);

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_DEVICE_ID',
      });
    }

    const state = await this.buildDesiredState(normalizedDeviceId);
    return {
      success: true,
      data: state,
    };
  }

  private async buildDesiredState(deviceId: string): Promise<AgentDesiredState> {
    const remoteSettings = await getRemoteModuleSettingsSnapshot();
    const chatwoot = readChatwootRuntimeConfig();
    const device = (await this.prisma.agentDevice.findUnique({
      where: { deviceId },
      select: DESIRED_STATE_DEVICE_INCLUDE,
    })) as DesiredStateDeviceRow;

    const remoteEnabled = Boolean(
      remoteSettings.rustDeskServerHost &&
      remoteSettings.rustDeskServerConfig,
    );
    const sysproInstalls = this.buildDeviceSysproInstalls(device);

    return {
      version: 1,
      updated_at: new Date().toISOString(),
      remote: {
        enabled: remoteEnabled,
        version: 'go-agent-v1',
        mode: 'managed',
        install_if_missing: remoteSettings.rustDeskAutoInstall,
        bootstrap_enabled: true,
        sync_enabled: true,
        discovery_token: process.env.REMOTE_DISCOVERY_TOKEN?.trim() || undefined,
      },
      tunnel: {
        enabled: false,
        version: '',
        server_host: '',
        server_port: 0,
        remote_port: 0,
        local_target: '',
        token: '',
      },
      backup: {
        enabled: false,
        version: '',
        schedule: '',
        retention_days: 0,
        target: '',
      },
      support: {
        enabled: Boolean(chatwoot.url),
        version: 'go-agent-v1',
        provider: chatwoot.url ? 'chatwoot' : '',
        widget_base_url: chatwoot.url ?? '',
        auto_attach_context: true,
      },
      device: {
        enabled: true,
        version: 'go-agent-v1',
        collect_inventory: true,
        collect_metrics: true,
        syspro_installs: sysproInstalls,
      },
    };
  }

  private buildDeviceSysproInstalls(device: DesiredStateDeviceRow): NonNullable<AgentDesiredState['device']['syspro_installs']> {
    const updates = device?.remoteHost?.sysproUpdates ?? [];
    const installs: NonNullable<AgentDesiredState['device']['syspro_installs']> = [];
    const seen = new Set<string>();

    for (const update of updates) {
      const companyId = update.companyId?.trim();
      const serverPath = update.path?.trim();
      if (!companyId || !serverPath) continue;

      const dedupeKey = `${companyId.toLowerCase()}::${serverPath.replace(/[\\/]+/g, '\\').toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const companyName =
        update.company?.nomeFantasia?.trim() ||
        update.company?.razaoSocial?.trim() ||
        update.companyLabel.trim() ||
        companyId;

      installs.push({
        company_id: companyId,
        company_name: companyName,
        server_path: serverPath,
      });
    }

    return installs;
  }

  async listDevices(
    rawHeaders: Record<string, unknown> | undefined,
    query: Partial<AgentDeviceListQuery>,
  ): Promise<{ success: true; data: AgentDeviceListResult }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.trunc(query.pageSize ?? 50)));
    const search = query.search?.trim();
    const status = query.status ?? 'all';
    const companyId = query.companyId?.trim();
    const remoteHostId = (query as { remoteHostId?: string }).remoteHostId?.trim();

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

    const filters: Prisma.AgentDeviceWhereInput[] = [];
    if (companyId) filters.push({ companyId });
    if (remoteHostId) filters.push({ remoteHostId });
    if (search) {
      filters.push({
        OR: [
          { deviceId: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { hostname: { contains: search, mode: Prisma.QueryMode.insensitive } },
          { os: { contains: search, mode: Prisma.QueryMode.insensitive } },
        ],
      });
    }
    if (status === 'online') {
      filters.push(this.buildEffectiveOnlineWhere(onlineSince));
    } else if (status === 'offline') {
      filters.push(this.buildEffectiveOfflineWhere(onlineSince));
    }

    const where: Prisma.AgentDeviceWhereInput = filters.length ? { AND: filters } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.agentDevice.count({ where }),
      this.prisma.agentDevice.findMany({
        where,
        orderBy: [{ lastHeartbeatAt: 'desc' }, { hostname: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: DEVICE_INCLUDE as any,
      }),
    ]);

    const discoveredHeartbeatMap = await this.loadDiscoveredHeartbeatMap(
      (rows as unknown as DeviceRow[])
        .filter((row) => !row.remoteHostId)
        .map((row) => row.hostname),
    );

    const items: AgentDeviceSummary[] = (rows as unknown as DeviceRow[]).map((row) =>
      this.toSummary(row, onlineSince, discoveredHeartbeatMap.get(this.normalizeMachineNameKey(row.hostname))),
    );

    return {
      success: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    };
  }

  async getDevice(
    rawHeaders: Record<string, unknown> | undefined,
    deviceId: string,
  ): Promise<{ success: true; data: AgentDeviceSummary }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    const row = await this.prisma.agentDevice.findUnique({
      where: { deviceId: normalizedDeviceId },
      include: DEVICE_INCLUDE as any,
    });

    if (!row) {
      throw new NotFoundException({ success: false, error: 'AGENT_DEVICE_NOT_FOUND' });
    }

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    const discoveredHeartbeatMap = await this.loadDiscoveredHeartbeatMap([
      (row as unknown as DeviceRow).remoteHostId ? null : (row as unknown as DeviceRow).hostname,
    ]);
    return {
      success: true,
      data: this.toSummary(
        row as unknown as DeviceRow,
        onlineSince,
        discoveredHeartbeatMap.get(this.normalizeMachineNameKey((row as unknown as DeviceRow).hostname)),
      ),
    };
  }

  async getFleetStats(
    rawHeaders: Record<string, unknown> | undefined,
  ): Promise<{ success: true; data: AgentFleetStats }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    const effectiveOnlineWhere = this.buildEffectiveOnlineWhere(onlineSince);
    const seenWhere = this.buildHasEffectiveHeartbeatWhere();

    const [total, online, unseen, withCompany] = await this.prisma.$transaction([
      this.prisma.agentDevice.count(),
      this.prisma.agentDevice.count({ where: effectiveOnlineWhere }),
      this.prisma.agentDevice.count({ where: { NOT: seenWhere } }),
      this.prisma.agentDevice.count({ where: { companyId: { not: null } } }),
    ]);

    return {
      success: true,
      data: {
        total,
        online,
        offline: Math.max(0, total - online),
        unseen,
        withCompany,
        withoutCompany: Math.max(0, total - withCompany),
        onlineThresholdSeconds: ONLINE_THRESHOLD_SECONDS,
      },
    };
  }

  private toSummary(row: DeviceRow, onlineSince: Date, discoveredHeartbeatAt?: Date | null): AgentDeviceSummary {
    const lastHeartbeat = this.resolveEffectiveHeartbeatAt(row, discoveredHeartbeatAt);
    const isOnline = !!lastHeartbeat && lastHeartbeat >= onlineSince;
    const heartbeatLagSeconds = lastHeartbeat
      ? Math.max(0, differenceInSeconds(new Date(), lastHeartbeat))
      : null;

    const companyName = row.company
      ? row.company.nomeFantasia?.trim() || row.company.razaoSocial.trim()
      : null;

    const summary = {
      id: row.id,
      deviceId: row.deviceId,
      agentInstanceId: row.agentInstanceId ?? null,
      credentialId: row.credentialId ?? null,
      hostname: row.hostname,
      os: row.os,
      identitySource: row.identitySource,
      agentVersion: row.agentVersion,
      companyId: row.companyId,
      companyName,
      remoteHostId: row.remoteHostId,
      remoteHostName: row.remoteHost?.name ?? null,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastHeartbeatAt: lastHeartbeat ? lastHeartbeat.toISOString() : null,
      lastRegisteredAt: row.lastRegisteredAt ? row.lastRegisteredAt.toISOString() : null,
      isOnline,
      heartbeatLagSeconds,
    } as unknown as AgentDeviceSummary;

    return summary;
  }

  private resolveEffectiveHeartbeatAt(row: DeviceRow, discoveredHeartbeatAt?: Date | null): Date | null {
    const candidates = [
      row.lastHeartbeatAt,
      row.remoteHost?.lastHeartbeatSuccessAt ?? null,
      row.remoteHost?.lastHeartbeatAt ?? null,
      discoveredHeartbeatAt ?? null,
    ].filter((value): value is Date => value instanceof Date);

    if (!candidates.length) return null;

    return candidates.reduce((latest, current) => {
      return current.getTime() > latest.getTime() ? current : latest;
    });
  }

  private assertCompanyInScope(companyId: string, scope: AgentManageScope, errorCode: string) {
    if (scope.isGlobal) return;
    if (!scope.companyIds.includes(companyId)) {
      throw new ForbiddenException({ success: false, error: errorCode });
    }
  }

  private normalizeMachineNameKey(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
  }

  private async loadDiscoveredHeartbeatMap(
    machineNames: Array<string | null | undefined>,
  ): Promise<Map<string, Date>> {
    const normalized = Array.from(
      new Set(machineNames.map((value) => value?.trim()).filter((value): value is string => !!value)),
    );

    if (!normalized.length) {
      return new Map<string, Date>();
    }

    const rows = (await this.prisma.remoteDiscoveredHost.findMany({
      where: {
        status: { in: ['PENDING_LINK', 'LINKED'] },
        OR: normalized.map((machineName) => ({
          machineName: { equals: machineName, mode: 'insensitive' },
        })),
      },
      select: {
        machineName: true,
        lastHeartbeatAt: true,
      },
      orderBy: [{ lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
    })) as DiscoveredHeartbeatRow[];

    const map = new Map<string, Date>();
    for (const row of rows) {
      if (!(row.lastHeartbeatAt instanceof Date)) continue;
      const key = this.normalizeMachineNameKey(row.machineName);
      if (!key || map.has(key)) continue;
      map.set(key, row.lastHeartbeatAt);
    }

    return map;
  }

  private buildEffectiveOnlineWhere(onlineSince: Date): Prisma.AgentDeviceWhereInput {
    return {
      OR: [
        { lastHeartbeatAt: { gte: onlineSince } },
        { remoteHost: { is: { lastHeartbeatSuccessAt: { gte: onlineSince } } } },
        { remoteHost: { is: { lastHeartbeatAt: { gte: onlineSince } } } },
      ],
    };
  }

  private buildHasEffectiveHeartbeatWhere(): Prisma.AgentDeviceWhereInput {
    return {
      OR: [
        { lastHeartbeatAt: { not: null } },
        { remoteHost: { is: { lastHeartbeatSuccessAt: { not: null } } } },
        { remoteHost: { is: { lastHeartbeatAt: { not: null } } } },
      ],
    };
  }

  private buildEffectiveOfflineWhere(onlineSince: Date): Prisma.AgentDeviceWhereInput {
    return {
      NOT: this.buildEffectiveOnlineWhere(onlineSince),
    };
  }

  async deleteDevice(
    rawHeaders: Record<string, unknown> | undefined,
    deviceId: string,
  ): Promise<{ success: true; data: { deleted: true; deviceId: string } }> {
    const requester = await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    const device = await this.prisma.agentDevice.findUnique({
      where: { deviceId: normalizedDeviceId },
      select: {
        id: true,
        deviceId: true,
        hostname: true,
        remoteHostId: true,
        remoteHost: {
          select: {
            agentExternalId: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException({ success: false, error: 'AGENT_DEVICE_NOT_FOUND' });
    }

    await this.prisma.$transaction(async (tx) => {
      if (device.remoteHostId) {
        await tx.remoteHost.update({
          where: { id: device.remoteHostId },
          data: {
            agentTokenHash: null,
            agentTokenIssuedAt: null,
            agentTokenLastUsedAt: null,
            lastHeartbeatErrorAt: new Date(),
            lastHeartbeatErrorMessage:
              'Dispositivo removido do portal. Reinstale o agente para registrar novamente.',
          },
        });
      }

      await this.upsertIgnoredDiscoveredHost(tx, {
        machineName: device.hostname,
        agentExternalId: device.remoteHost?.agentExternalId ?? null,
        linkedHostId: device.remoteHostId,
      });

      await tx.agentDevice.delete({ where: { deviceId: normalizedDeviceId } });

      await tx.agentDeviceRevocation.upsert({
        where: { deviceId: normalizedDeviceId },
        create: {
          deviceId: normalizedDeviceId,
          hostname: device.hostname,
          revokedByUserId: requester.userId,
          reason: 'removed_by_portal',
        },
        update: {
          hostname: device.hostname,
          revokedAt: new Date(),
          revokedByUserId: requester.userId,
          reason: 'removed_by_portal',
        },
      });
    });

    this.logger.log({
      event: 'agent.device_deleted',
      deviceId: normalizedDeviceId,
      remoteHostId: device.remoteHostId,
      revokedByUserId: requester.userId,
    });

    return {
      success: true,
      data: {
        deleted: true,
        deviceId: normalizedDeviceId,
      },
    };
  }

  private async assertDeviceNotRevoked(
    deviceId: string,
    linkContext?: AgentRemoteLinkContext,
  ): Promise<void> {
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) return;
    void linkContext;

    const revoked = await this.prisma.agentDeviceRevocation.findUnique({
      where: { deviceId: normalizedDeviceId },
      select: { id: true },
    });

    if (revoked) {
      throw new ForbiddenException({
        success: false,
        error: 'AGENT_DEVICE_REVOKED',
        message: 'Este dispositivo foi removido do portal. Reinstale o agente para registrar novamente.',
      });
    }
  }

  private async upsertIgnoredDiscoveredHost(
    client: Prisma.TransactionClient,
    input: {
      machineName: string | null;
      agentExternalId: string | null;
      linkedHostId: string | null;
    },
  ) {
    const machineName = input.machineName?.trim() || null;
    const agentExternalId = input.agentExternalId?.trim() || null;
    const linkedHostId = input.linkedHostId?.trim() || null;

    if (!machineName && !agentExternalId && !linkedHostId) {
      return;
    }

    const existing = await client.remoteDiscoveredHost.findFirst({
      where: {
        OR: [
          ...(linkedHostId ? [{ linkedHostId }] : []),
          ...(agentExternalId ? [{ agentExternalId }] : []),
          ...(machineName ? [{ machineName }] : []),
        ],
      },
      orderBy: [{ updatedAt: 'desc' }],
      select: { id: true },
    });

    const data = {
      machineName,
      agentExternalId,
      provider: 'portal',
      environment: 'portal-removal',
      description: 'Host removido do portal. Reinstale ou reautorize o agente antes de rematerializar este registro.',
      serviceStatus: 'revoked',
      status: 'IGNORED' as const,
      linkedHostId: null,
      linkedAt: null,
      lastHeartbeatAt: new Date(),
    };

    if (existing) {
      await client.remoteDiscoveredHost.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await client.remoteDiscoveredHost.create({
      data,
    });
  }

  async listRevocations(
    rawHeaders: Record<string, unknown> | undefined,
  ): Promise<{ success: true; data: any[] }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');
    const rows = await this.prisma.agentDeviceRevocation.findMany({
      orderBy: { revokedAt: 'desc' },
    });
    return { success: true, data: rows };
  }

  async deleteRevocation(
    rawHeaders: Record<string, unknown> | undefined,
    deviceId: string,
  ): Promise<{ success: true; data: { deleted: true; deviceId: string } }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    await this.prisma.agentDeviceRevocation.deleteMany({
      where: { deviceId: normalizedDeviceId },
    });

    return {
      success: true,
      data: {
        deleted: true,
        deviceId: normalizedDeviceId,
      },
    };
  }

  async pruneInactiveDevices(
    rawHeaders: Record<string, unknown> | undefined,
  ): Promise<{ success: true; data: { deletedDevices: number; deletedDiscovered: number } }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');

    const thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // 1. Delete AgentDevices that are offline > 30 days and have no company or remoteHost link
    const deletedDevicesResult = await this.prisma.agentDevice.deleteMany({
      where: {
        lastHeartbeatAt: { lt: thresholdDate },
        companyId: null,
        remoteHostId: null,
      },
    });

    // 2. Delete RemoteDiscoveredHosts that are offline/unupdated > 30 days and are still pending link
    const deletedDiscoveredResult = await this.prisma.remoteDiscoveredHost.deleteMany({
      where: {
        OR: [
          { lastHeartbeatAt: { lt: thresholdDate } },
          { lastHeartbeatAt: null, updatedAt: { lt: thresholdDate } },
        ],
        linkedHostId: null,
        status: 'PENDING_LINK',
      },
    });

    this.logger.log({
      event: 'agent.inactive_pruned',
      deletedDevices: deletedDevicesResult.count,
      deletedDiscovered: deletedDiscoveredResult.count,
    });

    return {
      success: true,
      data: {
        deletedDevices: deletedDevicesResult.count,
        deletedDiscovered: deletedDiscoveredResult.count,
      },
    };
  }
}
