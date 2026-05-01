import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  agentDevicePatchSchema,
  agentHeartbeatPayloadSchema,
  agentRegisterPayloadSchema,
  type AgentDesiredState,
  type AgentDeviceListQuery,
  type AgentDeviceListResult,
  type AgentDeviceSummary,
  type AgentFleetStats,
} from '@dosc-syspro/contracts/agent';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { getRemoteModuleSettingsSnapshot } from '../../common/system-settings/remote-module-settings-snapshot';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

const ONLINE_THRESHOLD_SECONDS = 5 * 60;

const DEVICE_INCLUDE = {
  company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
  remoteHost: { select: { id: true, name: true } },
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
  } | null;
};

type LooseWhereInput = Record<string, unknown> & {
  OR?: Array<Record<string, unknown>>;
};

type AgentRemoteLinkContext = {
  remoteHostId?: string;
  companyId?: string;
  rustdeskId?: string;
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

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
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
      await this.ensurePendingDiscoveredHost({
        deviceId: payload.deviceId,
        hostname: payload.hostname ?? null,
        agentVersion: payload.agentVersion ?? null,
        companyId: remoteLinkContext.companyId ?? registeredDevice.companyId ?? null,
        rustdeskId: remoteLinkContext.rustdeskId,
        identitySource: payload.identitySource ?? null,
        os: payload.os ?? null,
        at: now,
      });
    }

    this.logger.log({
      event: 'agent.registered',
      deviceId: payload.deviceId,
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

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
        agentVersion: payload.agentVersion ?? null,
        companyId: remoteLinkContext.companyId ?? null,
        firstSeenAt: now,
        lastHeartbeatAt: now,
      },
      update: {
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
      await this.ensurePendingDiscoveredHost({
        deviceId: payload.deviceId,
        hostname: (device as { hostname?: string | null }).hostname ?? null,
        agentVersion: payload.agentVersion ?? null,
        companyId: remoteLinkContext.companyId ?? heartbeatDevice.companyId ?? null,
        rustdeskId: remoteLinkContext.rustdeskId,
        identitySource: (device as { identitySource?: string | null }).identitySource ?? null,
        os: (device as { os?: string | null }).os ?? null,
        at: now,
      });
    }

    return {
      success: true,
      data: {
        received: true,
        receivedAt: now.toISOString(),
        deviceId: payload.deviceId,
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

  private async ensurePendingDiscoveredHost(input: {
    deviceId: string;
    hostname: string | null;
    agentVersion: string | null;
    companyId: string | null;
    rustdeskId?: string;
    identitySource: string | null;
    os: string | null;
    at: Date;
  }): Promise<void> {
    try {
      const persistedDevice = await this.prisma.agentDevice.findUnique({
        where: { deviceId: input.deviceId },
        select: { remoteHostId: true },
      });

      if (persistedDevice?.remoteHostId) {
        return;
      }

      const machineName = input.hostname?.trim() || null;
      const agentExternalId = input.rustdeskId?.trim() || null;
      if (!machineName && !agentExternalId) {
        return;
      }

      const matchWhere = agentExternalId
        ? {
            OR: [
              { agentExternalId },
              ...(machineName ? [{ machineName }] : []),
            ],
          }
        : { machineName: machineName ?? undefined };

      // Reuse only records that are still pending/unlinked. A previously linked
      // discovery record for another machine named "SERVIDOR" must not block a
      // fresh pending record from appearing for manual sync.
      const existing = await this.prisma.remoteDiscoveredHost.findFirst({
        where: {
          AND: [
            matchWhere,
            {
              OR: [
                { linkedHostId: null },
                { status: { not: 'LINKED' as const } },
              ],
            },
          ],
        },
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
        },
      });

      const providerParts = [input.identitySource?.trim(), 'go-agent'].filter(Boolean);
      const descriptionParts = [
        input.os?.trim(),
        input.companyId ? `company:${input.companyId}` : null,
        `device:${input.deviceId}`,
      ].filter(Boolean);

      const data = {
        machineName,
        agentExternalId,
        agentVersion: input.agentVersion?.trim() || null,
        provider: providerParts.join(':') || 'go-agent',
        environment: 'agent-register',
        description: descriptionParts.join(' | ') || null,
        serviceStatus: 'online',
        lastHeartbeatAt: input.at,
        status: 'PENDING_LINK' as const,
      };

      if (existing) {
        await this.prisma.remoteDiscoveredHost.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.remoteDiscoveredHost.create({
          data,
        });
      }

      this.logger.log({
        event: 'agent.discovery_materialized',
        deviceId: input.deviceId,
        machineName,
        rustdeskId: agentExternalId,
        created: !existing,
      });
    } catch (err) {
      this.logger.warn({
        event: 'agent.discovery_materialize_failed',
        deviceId: input.deviceId,
        error: String(err),
      });
    }
  }

  async linkDevice(
    rawHeaders: Record<string, unknown> | undefined,
    deviceId: string,
    body: unknown,
  ): Promise<{ success: true; data: AgentDeviceSummary }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

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
      remoteSettings.rustDeskServerConfig &&
      remoteSettings.defaultPassword,
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

    const where: LooseWhereInput = {};
    if (companyId) where.companyId = companyId;
    if (remoteHostId) where.remoteHostId = remoteHostId;
    if (search) {
      where.OR = [
        { deviceId: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { hostname: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { os: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }
    if (status === 'online') {
      where.lastHeartbeatAt = { gte: onlineSince };
    } else if (status === 'offline') {
      const existingOr = Array.isArray(where.OR) ? where.OR : [];
      where.OR = [
        ...existingOr,
        { lastHeartbeatAt: null },
        { lastHeartbeatAt: { lt: onlineSince } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.agentDevice.count({ where: where as any }),
      this.prisma.agentDevice.findMany({
        where: where as any,
        orderBy: [{ lastHeartbeatAt: 'desc' }, { hostname: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: DEVICE_INCLUDE as any,
      }),
    ]);

    const items: AgentDeviceSummary[] = (rows as unknown as DeviceRow[]).map((row) =>
      this.toSummary(row, onlineSince),
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
    return { success: true, data: this.toSummary(row as unknown as DeviceRow, onlineSince) };
  }

  async getFleetStats(
    rawHeaders: Record<string, unknown> | undefined,
  ): Promise<{ success: true; data: AgentFleetStats }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

    const [total, online, unseen, withCompany] = await this.prisma.$transaction([
      this.prisma.agentDevice.count(),
      this.prisma.agentDevice.count({ where: { lastHeartbeatAt: { gte: onlineSince } } }),
      this.prisma.agentDevice.count({ where: { lastHeartbeatAt: null } }),
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

  private toSummary(row: DeviceRow, onlineSince: Date): AgentDeviceSummary {
    const lastHeartbeat = row.lastHeartbeatAt;
    const isOnline = !!lastHeartbeat && lastHeartbeat >= onlineSince;
    const heartbeatLagSeconds = lastHeartbeat
      ? Math.max(0, Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000))
      : null;

    const companyName = row.company
      ? row.company.nomeFantasia?.trim() || row.company.razaoSocial.trim()
      : null;

    const summary = {
      id: row.id,
      deviceId: row.deviceId,
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
}
