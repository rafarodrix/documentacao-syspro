import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  agentInstallationPatchSchema,
  agentHeartbeatPayloadSchema,
  agentRegisterPayloadSchema,
  agentTelemetryPayloadSchema,
  resolveDeviceCollectionDesiredState,
  type AgentDesiredState,
  type AgentInstallationListQuery,
  type AgentInstallationListResult,
  type AgentHostOption,
  type AgentInstallationSummary,
  type AgentFleetStats,
} from '@dosc-syspro/contracts/agent';
import type { RemoteMachineProfile } from '@dosc-syspro/contracts/remote';
import { readChatwootRuntimeConfig } from '@dosc-syspro/config';
import { persistHostTelemetryInventory } from '@dosc-syspro/remote-infra';
import { differenceInSeconds } from '@dosc-syspro/shared';
import { assertInternalApiKey } from '../../common/auth/internal-api-auth';
import { getRemoteModuleSettingsSnapshot } from '../../common/system-settings/remote-module-settings-snapshot';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import {
  buildAgentInstallationToken,
  hashAgentInstallationToken,
  isInternalApiKeyValid,
  readInstallationTokenHeader,
} from './agent-installation-token';
const ONLINE_THRESHOLD_SECONDS = 5 * 60;
const AUTO_RELEASE_REINSTALL_REVOCATION_REASONS = new Set([
  'removed_by_portal',
  'removed_by_remote_host_delete',
]);

const INSTALLATION_INCLUDE = {
  deviceRecord: {
    select: {
      id: true,
      deviceId: true,
      hostname: true,
      os: true,
      identitySource: true,
    },
  },
  company: { select: { id: true, nomeFantasia: true, razaoSocial: true } },
  capabilities: {
    where: { kind: 'REMOTE' as const },
    select: {
      id: true,
      kind: true,
      status: true,
      externalId: true,
      remoteHostId: true,
      companyId: true,
      remoteHost: {
        select: {
          id: true,
          name: true,
          lastHeartbeatAt: true,
          lastHeartbeatSuccessAt: true,
        },
      },
    },
  },
} as const;

const DESIRED_STATE_INSTALLATION_INCLUDE = {
  deviceRecord: {
    select: { id: true, deviceId: true },
  },
  capabilities: {
    where: { kind: 'REMOTE' as const },
    take: 1,
    select: {
      remoteHost: {
        select: {
          id: true,
          machineProfile: true,
          erpInstallations: {
            select: {
              id: true,
              rootPath: true,
              runtimeType: true,
              configuredPort: true,
              protocol: true,
              hostName: true,
              iisApplicationPath: true,
              companies: {
                where: { active: true, companyId: { not: null } },
                orderBy: [
                  { role: 'asc' },
                  { companyName: 'asc' },
                ] as Prisma.ErpInstallationCompanyOrderByWithRelationInput[],
                select: {
                  companyId: true,
                  companyName: true,
                  role: true,
                },
              },
            },
            orderBy: [{ rootPath: 'asc' }] as Prisma.ErpInstallationOrderByWithRelationInput[],
          },
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
    },
  },
} as const;

type InstallationRow = {
  id: string;
  agentInstanceId: string;
  credentialId: string;
  agentVersion: string | null;
  companyId: string | null;
  installationTokenHash?: string | null;
  installationTokenIssuedAt?: Date | null;
  installationTokenLastUsedAt?: Date | null;
  firstSeenAt: Date;
  lastHeartbeatAt: Date | null;
  lastRegisteredAt: Date | null;
  supersededAt: Date | null;
  deviceRecord: {
    id: string;
    deviceId: string;
    hostname: string | null;
    os: string | null;
    identitySource: string | null;
  };
  company: {
    id: string;
    nomeFantasia: string | null;
    razaoSocial: string;
  } | null;
  capabilities: Array<{
    id: string;
    kind: 'REMOTE';
    status: string;
    externalId: string | null;
    remoteHostId: string | null;
    companyId: string | null;
    remoteHost: {
      id: string;
      name: string;
      lastHeartbeatAt: Date | null;
      lastHeartbeatSuccessAt: Date | null;
    } | null;
  }>;
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

type ManualLinkDiscoveredHostRow = {
  id: string;
  linkedHostId: string | null;
  machineName: string | null;
  agentExternalId: string | null;
};

type DeviceRevocationRow = {
  id: string;
  deviceId: string;
  hostname: string | null;
  reason: string | null;
};

type DesiredStateInstallationRow = {
  deviceRecord: {
    id: string;
    deviceId: string;
  };
  capabilities: Array<{
    remoteHost: {
      id: string;
      machineProfile: string | null;
      erpInstallations: Array<{
        id: string;
        rootPath: string;
        runtimeType: 'SYSPRO_SERVER' | 'IIS' | null;
        configuredPort: number | null;
        protocol: 'HTTP' | 'HTTPS' | 'TCP' | null;
        hostName: string | null;
        iisApplicationPath: string | null;
        companies: Array<{
          companyId: string | null;
          companyName: string;
          role: 'PRIMARY' | 'SECONDARY';
        }>;
      }>;
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
  }>;
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
    const rawRemoteLinkContext = this.normalizeRemoteLinkContext(payload.remoteLinkContext);
    const remoteLinkContext = await this.resolveRegisterLinkContextAfterRevocation({
      deviceId: parsed.data.deviceId,
      hostname: payload.hostname,
      remoteLinkContext: rawRemoteLinkContext,
    });

    const installation = await this.upsertInstallationPresence({
      deviceId: payload.deviceId,
      agentInstanceId: payload.agentInstanceId,
      credentialId: payload.credentialId,
      hostname: payload.hostname,
      os: payload.os,
      identitySource: payload.identitySource,
      agentVersion: payload.agentVersion,
      remoteLinkContext,
      now,
      markRegistered: true,
    });

    if (!this.getRemoteCapability(installation)?.remoteHostId) {
      await this.tryLinkRemoteHost(installation.id, payload.deviceId, remoteLinkContext, installation.companyId);
    }

    const installationToken = buildAgentInstallationToken();
    await this.prisma.agentInstallation.update({
      where: { id: installation.id },
      data: {
        installationTokenHash: hashAgentInstallationToken(installationToken),
        installationTokenIssuedAt: now,
        installationTokenLastUsedAt: now,
      },
    });

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
        installationToken,
      },
    };
  }

  async heartbeat(
    internalApiKey: string | undefined,
    body: unknown,
    headers?: Record<string, unknown>,
  ) {
    const parsed = agentHeartbeatPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_HEARTBEAT_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    await this.assertFleetAuth({
      internalApiKey,
      headers,
      deviceId: payload.deviceId,
      agentInstanceId: payload.agentInstanceId,
      credentialId: payload.credentialId,
    });

    const now = new Date();
    const remoteLinkContext = this.normalizeRemoteLinkContext(payload.remoteLinkContext);

    await this.assertDeviceNotRevoked(parsed.data.deviceId);

    const installation = await this.upsertInstallationPresence({
      deviceId: payload.deviceId,
      agentInstanceId: payload.agentInstanceId,
      credentialId: payload.credentialId,
      agentVersion: payload.agentVersion,
      remoteLinkContext,
      now,
      markRegistered: false,
    });

    if (!this.getRemoteCapability(installation)?.remoteHostId) {
      await this.tryLinkRemoteHost(installation.id, payload.deviceId, remoteLinkContext, installation.companyId);
    }

    const installationToken = await this.ensureInstallationToken({
      installationId: installation.id,
      currentHash: installation.installationTokenHash,
      allowMintWithInternalKey: isInternalApiKeyValid(internalApiKey),
      alreadyAuthenticatedWithToken: Boolean(readInstallationTokenHeader(headers)),
    });

    return {
      success: true,
      data: {
        received: true,
        receivedAt: now.toISOString(),
        deviceId: payload.deviceId,
        agentInstanceId: payload.agentInstanceId,
        ...(installationToken ? { installationToken } : {}),
      },
    };
  }

  /**
   * Best-effort: bind an AgentInstallation capability to the RemoteHost explicitly referenced
   * by the remote runtime state. We do not infer by hostname because common
   * names such as "SERVIDOR" collide across customers.
   */
  private async tryLinkRemoteHost(
    installationId: string,
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
            OR: [
              { agentCapabilities: { none: { kind: 'REMOTE' } } },
              { agentCapabilities: { some: { installationId, kind: 'REMOTE' } } },
            ],
          } as any,
          select: { id: true, companyId: true },
        });
      }

      if (!match && linkContext.rustdeskId) {
        const rustdeskMatches = await this.prisma.remoteHost.findMany({
          where: {
            agentExternalId: linkContext.rustdeskId,
            ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
            OR: [
              { agentCapabilities: { none: { kind: 'REMOTE' } } },
              { agentCapabilities: { some: { installationId, kind: 'REMOTE' } } },
            ],
          } as any,
          select: { id: true, companyId: true },
          take: 2,
        });
        if (rustdeskMatches.length === 1) {
          match = rustdeskMatches[0];
        }
      }

      if (!match) return;


      const targetCompanyId = match.companyId;
      const shouldPropagateToAgent = targetCompanyId !== companyId;

      await this.prisma.$transaction(async (tx) => {
        if (shouldPropagateToAgent) {
          await tx.agentInstallation.update({
            where: { id: installationId },
            data: { companyId: targetCompanyId },
          });
        }

        await tx.agentCapability.upsert({
          where: {
            installationId_kind: {
              installationId,
              kind: 'REMOTE',
            },
          },
          create: {
            installationId,
            kind: 'REMOTE',
            status: 'ACTIVE',
            externalId: linkContext.rustdeskId ?? null,
            companyId: targetCompanyId,
            remoteHostId: match.id,
            lastSeenAt: new Date(),
          },
          update: {
            status: 'ACTIVE',
            externalId: linkContext.rustdeskId ?? undefined,
            companyId: targetCompanyId,
            remoteHostId: match.id,
            lastSeenAt: new Date(),
          },
        });
      });

      this.logger.log({
        event: 'agent.host_linked',
        deviceId,
        remoteHostId: match.id,
        rustdeskId: linkContext.rustdeskId,
        linkedBy: linkContext.remoteHostId ? 'remote_host_id' : 'rustdesk_id',
        companyIdPropagated: shouldPropagateToAgent,
      });
    } catch (err) {
      this.logger.warn({ event: 'agent.host_link_failed', deviceId, error: String(err) });
    }
  }

  private async upsertInstallationPresence(input: {
    deviceId: string;
    agentInstanceId: string;
    credentialId: string;
    hostname?: string | null;
    os?: string | null;
    identitySource?: string | null;
    agentVersion?: string | null;
    remoteLinkContext: AgentRemoteLinkContext;
    now: Date;
    markRegistered: boolean;
  }): Promise<InstallationRow> {
    const installation = await this.prisma.$transaction(async (tx) => {
      const device = await tx.device.upsert({
        where: { deviceId: input.deviceId },
        create: {
          deviceId: input.deviceId,
          hostname: input.hostname ?? null,
          os: input.os ?? null,
          identitySource: input.identitySource ?? null,
          firstSeenAt: input.now,
          lastSeenAt: input.now,
        },
        update: {
          hostname: input.hostname ?? undefined,
          os: input.os ?? undefined,
          identitySource: input.identitySource ?? undefined,
          lastSeenAt: input.now,
        },
      });

      const installation = await tx.agentInstallation.upsert({
        where: { agentInstanceId: input.agentInstanceId },
        create: {
          deviceRecordId: device.id,
          agentInstanceId: input.agentInstanceId,
          credentialId: input.credentialId,
          agentVersion: input.agentVersion ?? null,
          companyId: input.remoteLinkContext.companyId ?? null,
          firstSeenAt: input.now,
          lastHeartbeatAt: input.now,
          lastRegisteredAt: input.markRegistered ? input.now : null,
          installedAt: input.now,
        },
        update: {
          deviceRecordId: device.id,
          credentialId: input.credentialId,
          agentVersion: input.agentVersion ?? undefined,
          companyId: input.remoteLinkContext.companyId ?? undefined,
          lastHeartbeatAt: input.now,
          lastRegisteredAt: input.markRegistered ? input.now : undefined,
          supersededAt: null,
        },
      });

      await tx.agentInstallation.updateMany({
        where: {
          deviceRecordId: device.id,
          id: { not: installation.id },
          supersededAt: null,
        },
        data: {
          supersededAt: input.now,
        },
      });

      if (
        input.remoteLinkContext.remoteHostId ||
        input.remoteLinkContext.rustdeskId ||
        input.remoteLinkContext.companyId
      ) {
        await tx.agentCapability.upsert({
          where: {
            installationId_kind: {
              installationId: installation.id,
              kind: 'REMOTE',
            },
          },
          create: {
            installationId: installation.id,
            kind: 'REMOTE',
            status: 'PENDING',
            externalId: input.remoteLinkContext.rustdeskId ?? null,
            companyId: input.remoteLinkContext.companyId ?? null,
            lastSeenAt: input.now,
          },
          update: {
            externalId: input.remoteLinkContext.rustdeskId ?? undefined,
            companyId: input.remoteLinkContext.companyId ?? undefined,
            lastSeenAt: input.now,
          },
        });
      }

      return tx.agentInstallation.findUnique({
        where: { id: installation.id },
        include: INSTALLATION_INCLUDE as any,
      });
    });

    return installation as unknown as InstallationRow;
  }

  private getRemoteCapability(
    row: { capabilities?: Array<Record<string, any>> } | null | undefined,
  ): Record<string, any> | null {
    if (!row || !Array.isArray(row.capabilities)) {
      return null;
    }
    return row.capabilities[0] ?? null;
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
  ): Promise<{ success: true; data: AgentInstallationSummary }> {
    const requester = await this.authorizationService.assertPermission(rawHeaders as any, 'agents:manage');
    const scope = await this.authorizationService.resolveCompanyAccessScope(requester, 'agents:manage');

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    const parsed = agentInstallationPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_PATCH_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    let hostCompanyId: string | undefined;
    let targetHost:
      | {
          id: string;
          companyId: string;
          machineName: string | null;
          agentExternalId: string | null;
        }
      | null = null;
    if (parsed.data.remoteHostId !== null) {
      const host = await this.prisma.remoteHost.findUnique({
        where: { id: parsed.data.remoteHostId },
        select: {
          id: true,
          companyId: true,
          machineName: true,
          agentExternalId: true,
        },
      });
      if (!host) {
        throw new NotFoundException({ success: false, error: 'REMOTE_HOST_NOT_FOUND' });
      }
      this.assertCompanyInScope(host.companyId, scope, 'REMOTE_HOST_OUT_OF_SCOPE');
      targetHost = host;
      hostCompanyId = host.companyId;
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const installation = await tx.agentInstallation.findFirst({
          where: {
            supersededAt: null,
            deviceRecord: { deviceId: normalizedDeviceId },
          },
          orderBy: [{ lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
          select: {
            id: true,
            deviceRecord: {
              select: {
                hostname: true,
              },
            },
            capabilities: {
              where: {
                kind: 'REMOTE',
              },
              take: 1,
              select: {
                externalId: true,
              },
            },
          },
        });

        if (!installation) {
          throw new NotFoundException({ success: false, error: 'AGENT_INSTALLATION_NOT_FOUND' });
        }

        if (parsed.data.remoteHostId === null) {
          await tx.agentCapability.deleteMany({
            where: {
              installationId: installation.id,
              kind: 'REMOTE',
            },
          });
        } else {
          await tx.agentCapability.upsert({
            where: {
              installationId_kind: {
                installationId: installation.id,
                kind: 'REMOTE',
              },
            },
            create: {
              installationId: installation.id,
              kind: 'REMOTE',
              status: 'ACTIVE',
              companyId: hostCompanyId ?? null,
              remoteHostId: parsed.data.remoteHostId,
              lastSeenAt: new Date(),
            },
            update: {
              status: 'ACTIVE',
              companyId: hostCompanyId ?? undefined,
              remoteHostId: parsed.data.remoteHostId,
              lastSeenAt: new Date(),
            },
          });

          if (targetHost) {
            await this.syncManualLinkDiscoveredHost(tx, {
              remoteHostId: targetHost.id,
              deviceMachineName: installation.deviceRecord?.hostname ?? null,
              hostMachineName: targetHost.machineName,
              capabilityExternalId: installation.capabilities?.[0]?.externalId ?? null,
              hostAgentExternalId: targetHost.agentExternalId,
            });
          }
        }

        await tx.agentInstallation.update({
          where: { id: installation.id },
          data: {
            ...(hostCompanyId ? { companyId: hostCompanyId } : {}),
          },
        });

        return tx.agentInstallation.findUnique({
          where: { id: installation.id },
          include: INSTALLATION_INCLUDE as any,
        });
      });
      const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

      this.logger.log({
        event: parsed.data.remoteHostId ? 'agent.host_linked_manual' : 'agent.host_unlinked_manual',
        deviceId: normalizedDeviceId,
        remoteHostId: parsed.data.remoteHostId,
      });

      return { success: true, data: this.toSummary(row as unknown as InstallationRow, onlineSince) };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          throw new ConflictException({ success: false, error: 'HOST_ALREADY_LINKED' });
        }
        if (err.code === 'P2025') {
          throw new NotFoundException({ success: false, error: 'AGENT_INSTALLATION_NOT_FOUND' });
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
                agentCapabilities: {
                  some: {
                    kind: 'REMOTE',
                    installation: {
                      supersededAt: null,
                      deviceRecord: {
                        OR: [
                          { hostname: { contains: search, mode: Prisma.QueryMode.insensitive } },
                          { deviceId: { contains: search, mode: Prisma.QueryMode.insensitive } },
                        ],
                      },
                    },
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
        agentCapabilities: {
          where: {
            kind: 'REMOTE',
            installation: {
              supersededAt: null,
            },
          },
          take: 1,
          orderBy: [{ updatedAt: 'desc' }],
          select: {
            installation: {
              select: {
                deviceRecord: {
                  select: {
                    deviceId: true,
                    hostname: true,
                  },
                },
              },
            },
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
        linkedDeviceId: row.agentCapabilities[0]?.installation.deviceRecord.deviceId ?? null,
        linkedDeviceHostname: row.agentCapabilities[0]?.installation.deviceRecord.hostname ?? null,
      })),
    };
  }

  async getDesiredState(
    internalApiKey: string | undefined,
    deviceId: string,
    headers?: Record<string, unknown>,
  ) {
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_DEVICE_ID',
      });
    }

    await this.assertFleetAuth({
      internalApiKey,
      headers,
      deviceId: normalizedDeviceId,
    });

    const state = await this.buildDesiredState(normalizedDeviceId);
    return {
      success: true,
      data: state,
    };
  }

  async ingestTelemetry(
    internalApiKey: string | undefined,
    deviceId: string,
    body: unknown,
    headers?: Record<string, unknown>,
  ) {
    const parsed = agentTelemetryPayloadSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_AGENT_TELEMETRY_PAYLOAD',
        details: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId || normalizedDeviceId !== payload.deviceId) {
      throw new BadRequestException({ success: false, error: 'DEVICE_ID_MISMATCH' });
    }

    await this.assertFleetAuth({
      internalApiKey,
      headers,
      deviceId: payload.deviceId,
      agentInstanceId: payload.agentInstanceId,
      credentialId: payload.credentialId,
    });

    await this.assertDeviceNotRevoked(payload.deviceId);

    const installation = await this.prisma.agentInstallation.findFirst({
      where: {
        supersededAt: null,
        agentInstanceId: payload.agentInstanceId,
        credentialId: payload.credentialId,
        deviceRecord: { deviceId: payload.deviceId },
      },
      select: {
        id: true,
        capabilities: {
          where: { kind: 'REMOTE' },
          take: 1,
          select: { remoteHostId: true },
        },
      },
    });

    if (!installation) {
      throw new NotFoundException({ success: false, error: 'INSTALLATION_NOT_FOUND' });
    }

    const remoteHostId = installation.capabilities[0]?.remoteHostId ?? null;
    const now = payload.collectedAt ? new Date(payload.collectedAt) : new Date();
    let publishedCollectors: string[] = [];

    if (remoteHostId) {
      publishedCollectors = await persistHostTelemetryInventory({
        hostId: remoteHostId,
        heartbeatAt: Number.isNaN(now.getTime()) ? new Date() : now,
        agentVersion: payload.agentVersion ?? null,
        systemSnapshot: payload.systemSnapshot,
        networkSnapshot: payload.networkSnapshot,
        softwareSnapshot: payload.softwareSnapshot,
        hardwareIdentity: payload.hardwareIdentity,
        diskSnapshot: payload.diskSnapshot,
        sysproProcesses: payload.sysproProcesses,
        sysproVersions: payload.sysproVersions,
        sysproRuntimeProbes: payload.sysproRuntimeProbes,
        windowsUpdateStatus: payload.windowsUpdateStatus,
        allServicesSnapshot: payload.allServicesSnapshot,
        rebootPending: payload.rebootPending,
        agentMetrics: payload.agentMetrics,
        criticalEvents: payload.criticalEvents,
      });
    }

    await this.prisma.agentInstallation.update({
      where: { id: installation.id },
      data: {
        lastHeartbeatAt: Number.isNaN(now.getTime()) ? new Date() : now,
        ...(payload.agentVersion ? { agentVersion: payload.agentVersion } : {}),
      },
    });

    return {
      success: true,
      data: {
        accepted: true,
        receivedAt: new Date().toISOString(),
        deviceId: payload.deviceId,
        remoteHostId,
        publishedCollectors,
      },
    };
  }

  /**
   * Auth da frota: token por instalação (preferencial) OU INTERNAL_API_KEY (legado/transição).
   * Token amarra deviceId (+ opcionalmente instance/credential) e impede impersonação só com a chave compartilhada.
   */
  private async assertFleetAuth(input: {
    internalApiKey: string | undefined;
    headers?: Record<string, unknown>;
    deviceId: string;
    agentInstanceId?: string;
    credentialId?: string;
  }) {
    const installationToken = readInstallationTokenHeader(input.headers);
    if (installationToken) {
      const tokenHash = hashAgentInstallationToken(installationToken);
      const installation = await this.prisma.agentInstallation.findFirst({
        where: {
          supersededAt: null,
          installationTokenHash: tokenHash,
          deviceRecord: { deviceId: input.deviceId },
          ...(input.agentInstanceId ? { agentInstanceId: input.agentInstanceId } : {}),
          ...(input.credentialId ? { credentialId: input.credentialId } : {}),
        },
        select: { id: true },
      });
      if (!installation) {
        throw new UnauthorizedException({ success: false, error: 'INVALID_INSTALLATION_TOKEN' });
      }
      await this.prisma.agentInstallation.update({
        where: { id: installation.id },
        data: { installationTokenLastUsedAt: new Date() },
      });
      return;
    }

    if (isInternalApiKeyValid(input.internalApiKey)) {
      return;
    }

    throw new UnauthorizedException({
      success: false,
      error: 'MISSING_FLEET_AUTH',
      message: 'Informe x-agent-installation-token ou x-internal-api-key.',
    });
  }

  /** Emite token para instalações legadas autenticadas ainda só com INTERNAL_API_KEY. */
  private async ensureInstallationToken(input: {
    installationId: string;
    currentHash?: string | null;
    allowMintWithInternalKey: boolean;
    alreadyAuthenticatedWithToken: boolean;
  }): Promise<string | undefined> {
    if (input.currentHash || input.alreadyAuthenticatedWithToken || !input.allowMintWithInternalKey) {
      return undefined;
    }

    const installationToken = buildAgentInstallationToken();
    const now = new Date();
    await this.prisma.agentInstallation.update({
      where: { id: input.installationId },
      data: {
        installationTokenHash: hashAgentInstallationToken(installationToken),
        installationTokenIssuedAt: now,
        installationTokenLastUsedAt: now,
      },
    });
    return installationToken;
  }

  private async buildDesiredState(deviceId: string): Promise<AgentDesiredState> {
    const remoteSettings = await getRemoteModuleSettingsSnapshot();
    const chatwoot = readChatwootRuntimeConfig();
    const installation = (await this.prisma.agentInstallation.findFirst({
      where: {
        supersededAt: null,
        deviceRecord: { deviceId },
      },
      orderBy: [{ lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
      select: DESIRED_STATE_INSTALLATION_INCLUDE,
    })) as DesiredStateInstallationRow;

    const remoteEnabled = Boolean(
      remoteSettings.rustDeskServerHost &&
      remoteSettings.rustDeskServerConfig,
    );
    const remoteHost = this.getRemoteCapability(installation)?.remoteHost ?? null;
    const linked = Boolean(remoteHost?.id);
    const collection = resolveDeviceCollectionDesiredState({
      linked,
      machineProfile: (remoteHost?.machineProfile ?? null) as RemoteMachineProfile | null,
    });
    const sysproInstallationHints = linked
      ? this.buildDeviceSysproInstallationHints(installation)
      : [];

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
        collect_inventory: collection.collect_inventory,
        collect_metrics: collection.collect_metrics,
        collection_profile: collection.collection_profile,
        collectors: collection.collectors,
        syspro_installation_hints: sysproInstallationHints,
      },
    };
  }

  private buildDeviceSysproInstallationHints(
    installation: DesiredStateInstallationRow,
  ): NonNullable<AgentDesiredState['device']['syspro_installation_hints']> {
    const remoteHost = installation?.capabilities[0]?.remoteHost ?? null;
    const hints: NonNullable<AgentDesiredState['device']['syspro_installation_hints']> = [];
    const seen = new Set<string>();

    for (const erp of remoteHost?.erpInstallations ?? []) {
      const path = erp.rootPath?.trim();
      const primaryCompany =
        erp.companies.find((entry) => entry.role === 'PRIMARY' && entry.companyId) ??
        erp.companies.find((entry) => entry.companyId);
      const companyId = primaryCompany?.companyId?.trim();
      if (!path || !companyId) continue;

      const dedupeKey = `${companyId.toLowerCase()}::${path.replace(/[\\/]+/g, '\\').toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      hints.push({
        company_id: companyId,
        company_name: primaryCompany?.companyName?.trim() || companyId,
        path,
        installation_id: erp.id,
        runtime_type: erp.runtimeType ?? undefined,
        port: erp.configuredPort ?? undefined,
        protocol: erp.protocol ?? undefined,
        host: erp.hostName ?? undefined,
        iis_path: erp.iisApplicationPath ?? undefined,
      });
    }

    for (const update of remoteHost?.sysproUpdates ?? []) {
      const companyId = update.companyId?.trim();
      const path = update.path?.trim();
      if (!companyId || !path) continue;

      const dedupeKey = `${companyId.toLowerCase()}::${path.replace(/[\\/]+/g, '\\').toLowerCase()}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const companyName =
        update.company?.nomeFantasia?.trim() ||
        update.company?.razaoSocial?.trim() ||
        update.companyLabel.trim() ||
        companyId;

      hints.push({
        company_id: companyId,
        company_name: companyName,
        path,
      });
    }

    return hints;
  }

  async listDevices(
    rawHeaders: Record<string, unknown> | undefined,
    query: Partial<AgentInstallationListQuery>,
  ): Promise<{ success: true; data: AgentInstallationListResult }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.trunc(query.pageSize ?? 50)));
    const search = query.search?.trim();
    const status = query.status ?? 'all';
    const companyId = query.companyId?.trim();
    const remoteHostId = (query as { remoteHostId?: string }).remoteHostId?.trim();

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);

    const filters: Prisma.AgentInstallationWhereInput[] = [{ supersededAt: null }];
    if (companyId) filters.push({ companyId });
    if (remoteHostId) {
      filters.push({
        capabilities: {
          some: {
            kind: 'REMOTE',
            remoteHostId,
          },
        },
      });
    }
    if (search) {
      filters.push({
        OR: [
          { deviceRecord: { deviceId: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { deviceRecord: { hostname: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          { deviceRecord: { os: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        ],
      });
    }
    if (status === 'online') {
      filters.push(this.buildEffectiveOnlineWhere(onlineSince));
    } else if (status === 'offline') {
      filters.push(this.buildEffectiveOfflineWhere(onlineSince));
    }

    const where: Prisma.AgentInstallationWhereInput = filters.length ? { AND: filters } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.agentInstallation.count({ where }),
      this.prisma.agentInstallation.findMany({
        where,
        orderBy: [{ lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: INSTALLATION_INCLUDE as any,
      }),
    ]);

    const discoveredHeartbeatMap = await this.loadDiscoveredHeartbeatMap(
      (rows as unknown as InstallationRow[])
        .filter((row) => !this.getRemoteCapability(row)?.remoteHostId)
        .map((row) => row.deviceRecord.hostname),
    );

    const items: AgentInstallationSummary[] = (rows as unknown as InstallationRow[]).map((row) =>
      this.toSummary(row, onlineSince, discoveredHeartbeatMap.get(this.normalizeMachineNameKey(row.deviceRecord.hostname))),
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
  ): Promise<{ success: true; data: AgentInstallationSummary }> {
    await this.authorizationService.assertPermission(rawHeaders as any, 'agents:view');

    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) {
      throw new BadRequestException({ success: false, error: 'INVALID_DEVICE_ID' });
    }

    const row = await this.prisma.agentInstallation.findFirst({
      where: {
        supersededAt: null,
        deviceRecord: { deviceId: normalizedDeviceId },
      },
      orderBy: [{ lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
      include: INSTALLATION_INCLUDE as any,
    });

    if (!row) {
      throw new NotFoundException({ success: false, error: 'AGENT_INSTALLATION_NOT_FOUND' });
    }

    const onlineSince = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000);
    const discoveredHeartbeatMap = await this.loadDiscoveredHeartbeatMap([
      this.getRemoteCapability(row as unknown as InstallationRow)?.remoteHostId
        ? null
        : (row as unknown as InstallationRow).deviceRecord.hostname,
    ]);
    return {
      success: true,
      data: this.toSummary(
        row as unknown as InstallationRow,
        onlineSince,
        discoveredHeartbeatMap.get(this.normalizeMachineNameKey((row as unknown as InstallationRow).deviceRecord.hostname)),
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
    const activeWhere: Prisma.AgentInstallationWhereInput = { supersededAt: null };

    const [total, online, unseen, withCompany] = await this.prisma.$transaction([
      this.prisma.agentInstallation.count({ where: activeWhere }),
      this.prisma.agentInstallation.count({ where: { AND: [activeWhere, effectiveOnlineWhere] } }),
      this.prisma.agentInstallation.count({ where: { AND: [activeWhere, { NOT: seenWhere }] } }),
      this.prisma.agentInstallation.count({ where: { AND: [activeWhere, { companyId: { not: null } }] } }),
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

  private toSummary(row: InstallationRow, onlineSince: Date, discoveredHeartbeatAt?: Date | null): AgentInstallationSummary {
    const remoteCapability = this.getRemoteCapability(row);
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
      deviceId: row.deviceRecord.deviceId,
      agentInstanceId: row.agentInstanceId ?? null,
      credentialId: row.credentialId ?? null,
      hostname: row.deviceRecord.hostname,
      os: row.deviceRecord.os,
      identitySource: row.deviceRecord.identitySource,
      agentVersion: row.agentVersion,
      companyId: row.companyId,
      companyName,
      remoteHostId: remoteCapability?.remoteHostId ?? null,
      remoteHostName: remoteCapability?.remoteHost?.name ?? null,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastHeartbeatAt: lastHeartbeat ? lastHeartbeat.toISOString() : null,
      lastRegisteredAt: row.lastRegisteredAt ? row.lastRegisteredAt.toISOString() : null,
      isOnline,
      heartbeatLagSeconds,
      hasInstallationToken: Boolean(row.installationTokenHash),
      installationTokenIssuedAt: row.installationTokenIssuedAt
        ? row.installationTokenIssuedAt.toISOString()
        : null,
      installationTokenLastUsedAt: row.installationTokenLastUsedAt
        ? row.installationTokenLastUsedAt.toISOString()
        : null,
    } as unknown as AgentInstallationSummary;

    return summary;
  }

  private resolveEffectiveHeartbeatAt(row: InstallationRow, discoveredHeartbeatAt?: Date | null): Date | null {
    const remoteCapability = this.getRemoteCapability(row);
    const candidates = [
      row.lastHeartbeatAt,
      remoteCapability?.remoteHost?.lastHeartbeatSuccessAt ?? null,
      remoteCapability?.remoteHost?.lastHeartbeatAt ?? null,
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

  private normalizeLookupValue(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
  }

  private normalizeMachineNameKey(value: string | null | undefined) {
    return this.normalizeLookupValue(value);
  }

  private buildLookupValues(values: Array<string | null | undefined>) {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of values) {
      const trimmed = value?.trim();
      const key = this.normalizeLookupValue(trimmed);
      if (!trimmed || !key || seen.has(key)) continue;
      seen.add(key);
      normalized.push(trimmed);
    }

    return normalized;
  }

  private isAutoReleaseReinstallRevocation(reason: string | null | undefined) {
    return reason ? AUTO_RELEASE_REINSTALL_REVOCATION_REASONS.has(reason) : false;
  }

  private buildRevocationForbiddenException() {
    return new ForbiddenException({
      success: false,
      error: 'AGENT_INSTALLATION_REVOKED',
      message: 'Este dispositivo foi removido do portal. Reinstale o agente para registrar novamente.',
    });
  }

  private findReinstallDiscoveredHostCandidate(
    rows: ManualLinkDiscoveredHostRow[],
    input: {
      agentExternalIds: string[];
      machineNames: string[];
    },
  ): ManualLinkDiscoveredHostRow | null {
    for (const agentExternalId of input.agentExternalIds) {
      const normalizedAgentExternalId = this.normalizeLookupValue(agentExternalId);
      const matches = rows.filter(
        (row) => this.normalizeLookupValue(row.agentExternalId) === normalizedAgentExternalId,
      );
      if (matches.length > 0) {
        return matches[0];
      }
    }

    for (const machineName of input.machineNames) {
      const normalizedMachineName = this.normalizeLookupValue(machineName);
      const matches = rows.filter(
        (row) => this.normalizeLookupValue(row.machineName) === normalizedMachineName,
      );
      if (matches.length === 1) {
        return matches[0];
      }
    }

    if (rows.length === 1) {
      return rows[0];
    }

    return null;
  }

  private async reactivateIgnoredDiscoveredHostForReinstall(
    client: Prisma.TransactionClient,
    input: {
      hostname: string | null;
      rustdeskId: string | null;
    },
  ) {
    const agentExternalIds = this.buildLookupValues([input.rustdeskId]);
    const machineNames = this.buildLookupValues([input.hostname]);
    if (!agentExternalIds.length && !machineNames.length) {
      return null;
    }

    const rows = (await client.remoteDiscoveredHost.findMany({
      where: {
        status: 'IGNORED',
        linkedHostId: null,
        OR: [
          ...agentExternalIds.map((agentExternalId) => ({
            agentExternalId: { equals: agentExternalId, mode: Prisma.QueryMode.insensitive },
          })),
          ...machineNames.map((machineName) => ({
            machineName: { equals: machineName, mode: Prisma.QueryMode.insensitive },
          })),
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { lastHeartbeatAt: 'desc' }],
      select: {
        id: true,
        linkedHostId: true,
        machineName: true,
        agentExternalId: true,
      },
    })) as ManualLinkDiscoveredHostRow[];

    const candidate = this.findReinstallDiscoveredHostCandidate(rows, {
      agentExternalIds,
      machineNames,
    });
    if (!candidate) {
      return null;
    }

    await client.remoteDiscoveredHost.update({
      where: { id: candidate.id },
      data: {
        status: 'PENDING_LINK',
        linkedHostId: null,
        linkedAt: null,
        lastHeartbeatAt: new Date(),
        description:
          'Dispositivo reinstalado e reautorizado automaticamente apos remocao anterior no portal. Aguardando novo vinculo.',
        ...(machineNames[0] ? { machineName: machineNames[0] } : {}),
        ...(agentExternalIds[0] ? { agentExternalId: agentExternalIds[0] } : {}),
      },
    });

    return candidate.id;
  }

  private async resolveRegisterLinkContextAfterRevocation(input: {
    deviceId: string;
    hostname: string | null;
    remoteLinkContext: AgentRemoteLinkContext;
  }): Promise<AgentRemoteLinkContext> {
    const normalizedDeviceId = input.deviceId?.trim();
    if (!normalizedDeviceId) {
      return input.remoteLinkContext;
    }

    const revoked = await this.prisma.agentDeviceRevocation.findUnique({
      where: { deviceId: normalizedDeviceId },
      select: {
        id: true,
        deviceId: true,
        hostname: true,
        reason: true,
      },
    }) as DeviceRevocationRow | null;

    if (!revoked) {
      return input.remoteLinkContext;
    }

    if (!this.isAutoReleaseReinstallRevocation(revoked.reason)) {
      throw this.buildRevocationForbiddenException();
    }

    const reactivatedDiscoveredHostId = await this.prisma.$transaction(async (tx) => {
      await tx.agentDeviceRevocation.deleteMany({
        where: { deviceId: normalizedDeviceId },
      });

      return this.reactivateIgnoredDiscoveredHostForReinstall(tx, {
        hostname: input.hostname?.trim() || revoked.hostname,
        rustdeskId: input.remoteLinkContext.rustdeskId ?? null,
      });
    });

    this.logger.log({
      event: 'agent.revocation_auto_released_on_register',
      deviceId: normalizedDeviceId,
      reason: revoked.reason,
      reactivatedDiscoveredHostId,
      hostname: input.hostname ?? revoked.hostname,
      rustdeskId: input.remoteLinkContext.rustdeskId ?? null,
    });

    return {};
  }

  private findManualLinkDiscoveredHostCandidate(
    rows: ManualLinkDiscoveredHostRow[],
    input: {
      remoteHostId: string;
      agentExternalIds: string[];
      machineNames: string[];
    },
  ): ManualLinkDiscoveredHostRow | null {
    const exactLinked = rows.find((row) => row.linkedHostId === input.remoteHostId);
    if (exactLinked) {
      return exactLinked;
    }

    const availableRows = rows.filter((row) => !row.linkedHostId || row.linkedHostId === input.remoteHostId);

    for (const agentExternalId of input.agentExternalIds) {
      const normalizedAgentExternalId = this.normalizeLookupValue(agentExternalId);
      const match = availableRows.find(
        (row) => this.normalizeLookupValue(row.agentExternalId) === normalizedAgentExternalId,
      );
      if (match) {
        return match;
      }
    }

    for (const machineName of input.machineNames) {
      const normalizedMachineName = this.normalizeLookupValue(machineName);
      const match = availableRows.find((row) => this.normalizeLookupValue(row.machineName) === normalizedMachineName);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private async syncManualLinkDiscoveredHost(
    client: Prisma.TransactionClient,
    input: {
      remoteHostId: string;
      deviceMachineName: string | null;
      hostMachineName: string | null;
      capabilityExternalId: string | null;
      hostAgentExternalId: string | null;
    },
  ) {
    const agentExternalIds = this.buildLookupValues([input.capabilityExternalId, input.hostAgentExternalId]);
    const machineNames = this.buildLookupValues([input.deviceMachineName, input.hostMachineName]);

    const rows = (await client.remoteDiscoveredHost.findMany({
      where: {
        OR: [
          { linkedHostId: input.remoteHostId },
          ...agentExternalIds.map((agentExternalId) => ({
            agentExternalId: { equals: agentExternalId, mode: Prisma.QueryMode.insensitive },
          })),
          ...machineNames.map((machineName) => ({
            machineName: { equals: machineName, mode: Prisma.QueryMode.insensitive },
          })),
        ],
      },
      orderBy: [{ linkedAt: 'desc' }, { lastHeartbeatAt: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        linkedHostId: true,
        machineName: true,
        agentExternalId: true,
      },
    })) as ManualLinkDiscoveredHostRow[];

    const candidate = this.findManualLinkDiscoveredHostCandidate(rows, {
      remoteHostId: input.remoteHostId,
      agentExternalIds,
      machineNames,
    });

    if (!candidate) {
      return;
    }

    await client.remoteDiscoveredHost.update({
      where: { id: candidate.id },
      data: {
        linkedHostId: input.remoteHostId,
        linkedAt: new Date(),
        status: 'LINKED',
        ...(machineNames[0] ? { machineName: machineNames[0] } : {}),
        ...(agentExternalIds[0] ? { agentExternalId: agentExternalIds[0] } : {}),
      },
    });
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

  private buildEffectiveOnlineWhere(onlineSince: Date): Prisma.AgentInstallationWhereInput {
    return {
      OR: [
        { lastHeartbeatAt: { gte: onlineSince } },
        {
          capabilities: {
            some: {
              kind: 'REMOTE',
              remoteHost: { is: { lastHeartbeatSuccessAt: { gte: onlineSince } } },
            },
          },
        },
        {
          capabilities: {
            some: {
              kind: 'REMOTE',
              remoteHost: { is: { lastHeartbeatAt: { gte: onlineSince } } },
            },
          },
        },
      ],
    };
  }

  private buildHasEffectiveHeartbeatWhere(): Prisma.AgentInstallationWhereInput {
    return {
      OR: [
        { lastHeartbeatAt: { not: null } },
        {
          capabilities: {
            some: {
              kind: 'REMOTE',
              remoteHost: { is: { lastHeartbeatSuccessAt: { not: null } } },
            },
          },
        },
        {
          capabilities: {
            some: {
              kind: 'REMOTE',
              remoteHost: { is: { lastHeartbeatAt: { not: null } } },
            },
          },
        },
      ],
    };
  }

  private buildEffectiveOfflineWhere(onlineSince: Date): Prisma.AgentInstallationWhereInput {
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

    const device = await this.prisma.device.findUnique({
      where: { deviceId: normalizedDeviceId },
      select: {
        id: true,
        deviceId: true,
        hostname: true,
        installations: {
          where: { supersededAt: null },
          select: {
            id: true,
            capabilities: {
              where: { kind: 'REMOTE' },
              select: {
                remoteHostId: true,
                remoteHost: {
                  select: {
                    agentExternalId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException({ success: false, error: 'AGENT_INSTALLATION_NOT_FOUND' });
    }

    await this.prisma.$transaction(async (tx) => {
      const linkedCapabilities = device.installations.flatMap((installation) => installation.capabilities);

      for (const capability of linkedCapabilities) {
        if (!capability.remoteHostId) continue;
        await tx.remoteHost.update({
          where: { id: capability.remoteHostId },
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
        agentExternalId: linkedCapabilities[0]?.remoteHost?.agentExternalId ?? null,
        linkedHostId: linkedCapabilities[0]?.remoteHostId ?? null,
      });

      await tx.agentInstallation.deleteMany({
        where: { deviceRecordId: device.id },
      });
      await tx.device.delete({
        where: { id: device.id },
      });

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
      remoteHostId: device.installations[0]?.capabilities[0]?.remoteHostId ?? null,
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

  private async assertDeviceNotRevoked(deviceId: string): Promise<void> {
    const normalizedDeviceId = deviceId?.trim();
    if (!normalizedDeviceId) return;

    const revoked = await this.prisma.agentDeviceRevocation.findUnique({
      where: { deviceId: normalizedDeviceId },
      select: { id: true },
    });

    if (revoked) {
      throw this.buildRevocationForbiddenException();
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

    // 1. Delete agent installations that are offline > 30 days and have no company or remote capability link
    const deletedDevicesResult = await this.prisma.agentInstallation.deleteMany({
      where: {
        supersededAt: null,
        lastHeartbeatAt: { lt: thresholdDate },
        companyId: null,
        capabilities: {
          none: {
            kind: 'REMOTE',
            remoteHostId: { not: null },
          },
        },
      },
    });

    await this.prisma.device.deleteMany({
      where: {
        installations: {
          none: {},
        },
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
