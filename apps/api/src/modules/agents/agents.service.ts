import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
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

type DeviceRow = Prisma.AgentDeviceGetPayload<{ include: typeof DEVICE_INCLUDE }>;

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

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
        hostname: payload.hostname ?? null,
        os: payload.os ?? null,
        identitySource: payload.identitySource ?? null,
        agentVersion: payload.agentVersion ?? null,
        firstSeenAt: now,
        lastRegisteredAt: now,
        lastHeartbeatAt: now,
      },
      update: {
        hostname: payload.hostname ?? undefined,
        os: payload.os ?? undefined,
        identitySource: payload.identitySource ?? undefined,
        agentVersion: payload.agentVersion ?? undefined,
        lastRegisteredAt: now,
        lastHeartbeatAt: now,
      },
    });

    if (!device.remoteHostId && payload.hostname) {
      await this.tryLinkRemoteHost(payload.deviceId, payload.hostname, device.companyId);
    }

    this.logger.log({
      event: 'agent.registered',
      deviceId: payload.deviceId,
      hostname: payload.hostname,
      os: payload.os,
      identitySource: payload.identitySource,
      agentVersion: payload.agentVersion,
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

    const device = await this.prisma.agentDevice.upsert({
      where: { deviceId: payload.deviceId },
      create: {
        deviceId: payload.deviceId,
        agentVersion: payload.agentVersion ?? null,
        firstSeenAt: now,
        lastHeartbeatAt: now,
      },
      update: {
        agentVersion: payload.agentVersion ?? undefined,
        lastHeartbeatAt: now,
      },
    });

    if (!device.remoteHostId && device.hostname) {
      await this.tryLinkRemoteHost(payload.deviceId, device.hostname, device.companyId);
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
   * Best-effort: find a RemoteHost whose machineName matches the agent hostname.
   * Only links when exactly one unambiguous match exists so we never create a wrong link.
   * Scoped by companyId when available to avoid cross-company collisions.
   */
  private async tryLinkRemoteHost(
    deviceId: string,
    hostname: string,
    companyId: string | null,
  ): Promise<void> {
    try {
      const where: Prisma.RemoteHostWhereInput = {
        machineName: { equals: hostname, mode: Prisma.QueryMode.insensitive },
        agentDevice: null, // not yet linked to any device
      };
      if (companyId) {
        where.companyId = companyId;
      }

      const matches = await this.prisma.remoteHost.findMany({ where, select: { id: true }, take: 2 });
      if (matches.length !== 1) return;

      await this.prisma.agentDevice.update({
        where: { deviceId },
        data: { remoteHostId: matches[0].id },
      });

      this.logger.log({
        event: 'agent.host_linked',
        deviceId,
        hostname,
        remoteHostId: matches[0].id,
      });
    } catch (err) {
      // Match is best-effort — never fail the heartbeat/register because of this
      this.logger.warn({ event: 'agent.host_link_failed', deviceId, error: String(err) });
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

    const state = await this.buildDesiredState();
    return {
      success: true,
      data: state,
    };
  }

  private async buildDesiredState(): Promise<AgentDesiredState> {
    const remoteSettings = await getRemoteModuleSettingsSnapshot();
    const chatwoot = readChatwootRuntimeConfig();

    const remoteEnabled = Boolean(
      remoteSettings.rustDeskServerHost &&
      remoteSettings.rustDeskServerConfig &&
      remoteSettings.defaultPassword,
    );

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
        collect_inventory: false,
        collect_metrics: false,
      },
    };
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

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

    const where: Prisma.AgentDeviceWhereInput = {};
    if (companyId) where.companyId = companyId;
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
      where.OR = [
        ...(where.OR ?? []),
        { lastHeartbeatAt: null },
        { lastHeartbeatAt: { lt: onlineSince } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.agentDevice.count({ where }),
      this.prisma.agentDevice.findMany({
        where,
        orderBy: [{ lastHeartbeatAt: 'desc' }, { hostname: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: DEVICE_INCLUDE,
      }),
    ]);

    const items: AgentDeviceSummary[] = rows.map((row) => this.toSummary(row, onlineSince));

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
      include: DEVICE_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException({ success: false, error: 'AGENT_DEVICE_NOT_FOUND' });
    }

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    return { success: true, data: this.toSummary(row, onlineSince) };
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

    return {
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
    };
  }
}
