import { Prisma } from "@prisma/client";
import { prisma, buildScopedWhere } from "@dosc-syspro/database";
import { normalizeRustdeskIdStrict } from "./rustdesk-helpers";
import { resolveScopedCompanyContext } from "./scoped-company-context";
import {
  assertRemoteHostAgentExternalIdAvailable,
  isRemoteHostAgentExternalIdUniqueError,
  throwRemoteHostAgentExternalIdConflict,
} from "./remote-host-agent-external-id";
import { linkDiscoveredHostRecord } from "./discovered-host-linking";
import type {
  CreateHostInput,
  CreateHostOutput,
  DeleteHostInput,
  DeleteHostOutput,
  HostAgentTokenInput,
  IgnoreDiscoveredHostInput,
  IgnoreDiscoveredHostOutput,
  LinkDiscoveredHostInput,
  LinkDiscoveredHostOutput,
  RelinkHostSysproUpdateInput,
  RelinkHostSysproUpdateOutput,
  RevokeHostAgentTokenOutput,
  RotateHostAgentTokenOutput,
  UpdateHostInput,
  UpdateHostOutput,
  RemoteHostAdminPort,
} from "@dosc-syspro/remote-domain";

export function createRemoteHostAdminPort(): RemoteHostAdminPort {
  return {
    async linkDiscoveredHost(input: LinkDiscoveredHostInput): Promise<LinkDiscoveredHostOutput> {
      const result = await linkDiscoveredHostRecord({
        scope: input.scope,
        discoveredHostId: input.discoveredHostId,
        companyId: input.companyId,
        name: input.name,
        description: input.description,
      });

      return {
        hostId: result.hostId,
        discoveredHostId: result.discoveredHostId,
        created: result.created,
      };
    },

    async ignoreDiscoveredHost(input: IgnoreDiscoveredHostInput): Promise<IgnoreDiscoveredHostOutput> {
      const discoveredHost = await prisma.remoteDiscoveredHost.findFirst({
        where: { id: input.discoveredHostId },
        select: { id: true, status: true, linkedHostId: true },
      });

      if (!discoveredHost) {
        throw new Error("DISCOVERED_HOST_NOT_FOUND");
      }

      if (discoveredHost.linkedHostId) {
        throw new Error("DISCOVERED_HOST_ALREADY_LINKED");
      }

      await prisma.remoteDiscoveredHost.update({
        where: { id: discoveredHost.id },
        data: { status: "IGNORED" },
      });

      return { ignored: true, discoveredHostId: discoveredHost.id };
    },

    async createHost(input: CreateHostInput): Promise<CreateHostOutput> {
      await resolveScopedCompanyContext({ scope: input.scope, companyId: input.companyId });

      const incomingAgentExternalId = input.agentExternalId?.trim();
      const agentExternalId = normalizeRustdeskIdStrict(incomingAgentExternalId);
      if (incomingAgentExternalId && !agentExternalId) {
        throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
      }

      if (agentExternalId) {
        await assertRemoteHostAgentExternalIdAvailable({ agentExternalId });
      }

      let host;
      try {
        host = await prisma.remoteHost.create({
          data: {
            companyId: input.companyId,
            name: input.name,
            machineName: input.machineName?.trim() || null,
            machineProfile: input.machineProfile ?? null,
            environment: input.environment?.trim() || null,
            provider: input.provider?.trim() || "RustDesk",
            description: input.description?.trim() || null,
            notes: input.notes?.trim() || null,
            agentExternalId,
            installToken: buildInstallToken(),
            status: input.status ?? "ACTIVE",
          },
        });
      } catch (error) {
        if (!isRemoteHostAgentExternalIdUniqueError(error)) {
          throw error;
        }
        throwRemoteHostAgentExternalIdConflict();
        throw error;
      }

      return { host };
    },

    async updateHost(input: UpdateHostInput): Promise<UpdateHostOutput> {
      const scopedWhere = buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView);

      const existingHost = await prisma.remoteHost.findFirst({
        where: {
          id: input.hostId,
          ...scopedWhere,
        },
        select: { id: true },
      });

      if (!existingHost) {
        throw new Error("HOST_NOT_FOUND");
      }

      await resolveScopedCompanyContext({ scope: input.scope, companyId: input.companyId });

      const incomingAgentExternalId = input.agentExternalId?.trim();
      const agentExternalId = normalizeRustdeskIdStrict(incomingAgentExternalId);
      if (incomingAgentExternalId && !agentExternalId) {
        throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
      }

      if (agentExternalId) {
        await assertRemoteHostAgentExternalIdAvailable({
          agentExternalId,
          excludingHostId: input.hostId,
        });
      }

      let host;
      try {
        host = await prisma.remoteHost.update({
          where: { id: input.hostId },
          data: {
            companyId: input.companyId,
            name: input.name,
            machineName: input.machineName?.trim() || null,
            machineProfile: input.machineProfile ?? null,
            environment: input.environment?.trim() || null,
            provider: input.provider?.trim() || null,
            description: input.description?.trim() || null,
            notes: input.notes?.trim() || null,
            agentExternalId,
            status: input.status ?? "ACTIVE",
          },
        });
      } catch (error) {
        if (!isRemoteHostAgentExternalIdUniqueError(error)) {
          throw error;
        }
        throwRemoteHostAgentExternalIdConflict();
        throw error;
      }

      await prisma.agentDevice.updateMany({
        where: { remoteHostId: input.hostId },
        data: { companyId: input.companyId },
      });

      return { host };
    },

    async deleteHost(input: DeleteHostInput): Promise<DeleteHostOutput> {
      const scopedWhere = buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView);
      const existingHost = await prisma.remoteHost.findFirst({
        where: {
          id: input.hostId,
          ...scopedWhere,
        },
        select: {
          id: true,
          machineName: true,
          agentExternalId: true,
          sessions: {
            where: {
              status: { in: ["REQUESTED", "STARTED"] },
            },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!existingHost) {
        throw new Error("HOST_NOT_FOUND");
      }

      if (existingHost.sessions.length) {
        throw new Error("HOST_DELETE_HAS_ACTIVE_SESSION");
      }

      await prisma.$transaction(async (tx) => {
        const linkedDevice = await tx.agentDevice.findFirst({
          where: { remoteHostId: input.hostId },
          select: {
            deviceId: true,
            hostname: true,
          },
        });

        if (linkedDevice) {
          await tx.agentDeviceRevocation.upsert({
            where: { deviceId: linkedDevice.deviceId },
            create: {
              deviceId: linkedDevice.deviceId,
              hostname: linkedDevice.hostname,
              reason: 'removed_by_remote_host_delete',
            },
            update: {
              hostname: linkedDevice.hostname,
              revokedAt: new Date(),
              reason: 'removed_by_remote_host_delete',
            },
          });
        }

        await upsertIgnoredDiscoveredHost(tx, {
          machineName: existingHost.machineName ?? null,
          agentExternalId: existingHost.agentExternalId ?? null,
          linkedHostId: input.hostId,
        });

        await tx.agentDevice.updateMany({
          where: { remoteHostId: input.hostId },
          data: { remoteHostId: null },
        });

        await tx.remoteDiscoveredHost.updateMany({
          where: { linkedHostId: input.hostId },
          data: {
            status: "IGNORED",
            linkedHostId: null,
            linkedAt: null,
          },
        });

        await tx.remoteHost.delete({ where: { id: input.hostId } });
      });

      return { deleted: true };
    },

    async rotateHostAgentToken(input: HostAgentTokenInput): Promise<RotateHostAgentTokenOutput> {
      const scopedWhere = buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView);
      const existingHost = await prisma.remoteHost.findFirst({
        where: { id: input.hostId, ...scopedWhere },
        select: { id: true, name: true, agentTokenHash: true },
      });

      if (!existingHost) {
        throw new Error("HOST_NOT_FOUND");
      }

      if (!existingHost.agentTokenHash) {
        throw new Error("HOST_AGENT_TOKEN_NOT_ACTIVE");
      }

      const rotatedAt = new Date();
      const host = await prisma.$transaction(async (tx) => {
        const updatedHost = await tx.remoteHost.update({
          where: { id: input.hostId },
          data: {
            agentTokenHash: null,
            agentTokenIssuedAt: null,
            agentTokenLastUsedAt: null,
            lastHeartbeatErrorAt: rotatedAt,
            lastHeartbeatErrorMessage: "agentToken rotacionado pelo portal. Execute o bootstrap novamente para emitir nova credencial do agente.",
          },
          select: {
            id: true,
            name: true,
            agentTokenHash: true,
            lastHeartbeatErrorAt: true,
            lastHeartbeatErrorMessage: true,
          },
        });

        const existingPending = await tx.remoteAgentCommand.findFirst({
          where: {
            hostId: input.hostId,
            type: "ROTATE_TOKEN_REQUIRED",
            status: "PENDING",
          },
          select: { id: true },
        });

        if (!existingPending) {
          await tx.remoteAgentCommand.create({
            data: {
              hostId: input.hostId,
              type: "ROTATE_TOKEN_REQUIRED",
              status: "PENDING",
              reason: "O portal invalidou a credencial atual. Execute novo bootstrap autenticado neste host.",
              payload: {
                source: "portal",
                rotatedAt: rotatedAt.toISOString(),
              },
            },
          });
        }

        return updatedHost;
      });

      return {
        host,
        message: "agentToken rotacionado. Execute o bootstrap novamente no host para emitir nova credencial.",
      };
    },
    async revokeHostAgentToken(input: HostAgentTokenInput): Promise<RevokeHostAgentTokenOutput> {
      const scopedWhere = buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView);
      const existingHost = await prisma.remoteHost.findFirst({
        where: { id: input.hostId, ...scopedWhere },
        select: { id: true, name: true, agentTokenHash: true },
      });

      if (!existingHost) {
        throw new Error("HOST_NOT_FOUND");
      }

      if (!existingHost.agentTokenHash) {
        throw new Error("HOST_AGENT_TOKEN_NOT_ACTIVE");
      }

      const revokedAt = new Date();
      const host = await prisma.$transaction(async (tx) => {
        const updatedHost = await tx.remoteHost.update({
          where: { id: input.hostId },
          data: {
            agentTokenHash: null,
            agentTokenIssuedAt: null,
            agentTokenLastUsedAt: null,
            lastHeartbeatErrorAt: revokedAt,
            lastHeartbeatErrorMessage: "agentToken revogado manualmente pelo portal. Executar bootstrap novamente no host.",
          },
          select: {
            id: true,
            name: true,
            agentTokenHash: true,
            lastHeartbeatErrorAt: true,
            lastHeartbeatErrorMessage: true,
          },
        });

        const existingPending = await tx.remoteAgentCommand.findFirst({
          where: {
            hostId: input.hostId,
            type: "ROTATE_TOKEN_REQUIRED",
            status: "PENDING",
          },
          select: { id: true },
        });

        if (!existingPending) {
          await tx.remoteAgentCommand.create({
            data: {
              hostId: input.hostId,
              type: "ROTATE_TOKEN_REQUIRED",
              status: "PENDING",
              reason: "O portal revogou a credencial atual. Execute novo bootstrap autenticado neste host.",
              payload: {
                source: "portal",
                revokedAt: revokedAt.toISOString(),
              },
            },
          });
        }

        return updatedHost;
      });

      return {
        host,
        message: "agentToken revogado. Execute o bootstrap novamente para emitir nova credencial.",
      };
    },

    async relinkHostSysproUpdate(input: RelinkHostSysproUpdateInput): Promise<RelinkHostSysproUpdateOutput> {
      const scopedWhere = buildScopedWhere(input.scope.companyIds, input.scope.isGlobalView);

      const host = await prisma.remoteHost.findFirst({
        where: {
          id: input.hostId,
          ...scopedWhere,
        },
        select: { id: true },
      });

      if (!host) {
        throw new Error("HOST_NOT_FOUND");
      }

      const update = await prisma.remoteHostSysproUpdate.findFirst({
        where: {
          id: input.updateId,
          hostId: input.hostId,
        },
        select: {
          id: true,
          companyLabel: true,
          path: true,
          lastFileWriteAt: true,
          lastHeartbeatAt: true,
        },
      });

      if (!update) {
        throw new Error("SYSPRO_UPDATE_NOT_FOUND");
      }

      let nextCompanyId: string | null = null;
      let nextCompanyLabel: string | null = null;
      const targetCompanyId = input.companyId?.trim();
      if (targetCompanyId) {
        const company = await resolveScopedCompanyContext({ scope: input.scope, companyId: targetCompanyId });
        nextCompanyId = company.id;
        nextCompanyLabel = company.displayLabel;
      }

      const mode = input.mode === "add" ? "add" : "replace";

      if (mode === "add" && nextCompanyId) {
        const existingLink = await prisma.remoteHostSysproUpdate.findFirst({
          where: {
            hostId: input.hostId,
            path: update.path,
            companyId: nextCompanyId,
          },
          select: { id: true, companyId: true, companyLabel: true, path: true },
        });

        if (existingLink) {
          return { update: existingLink };
        }

        let saved;
        try {
          saved = await prisma.remoteHostSysproUpdate.create({
            data: {
              hostId: input.hostId,
              companyId: nextCompanyId,
              companyLabel: nextCompanyLabel ?? update.companyLabel,
              path: update.path,
              lastFileWriteAt: update.lastFileWriteAt,
              lastHeartbeatAt: update.lastHeartbeatAt,
            },
            select: { id: true, companyId: true, companyLabel: true, path: true },
          });
        } catch (error) {
          const isUniqueViolation =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: string }).code === "P2002";

          if (!isUniqueViolation) {
            throw error;
          }

          saved = await prisma.remoteHostSysproUpdate.create({
            data: {
              hostId: input.hostId,
              companyId: nextCompanyId,
              companyLabel: `${nextCompanyLabel ?? update.companyLabel} [${nextCompanyId.slice(0, 8)}]`,
              path: update.path,
              lastFileWriteAt: update.lastFileWriteAt,
              lastHeartbeatAt: update.lastHeartbeatAt,
            },
            select: { id: true, companyId: true, companyLabel: true, path: true },
          });
        }

        return { update: saved };
      }

      const saved = await prisma.remoteHostSysproUpdate.update({
        where: { id: input.updateId },
        data: {
          companyId: nextCompanyId,
          companyLabel: nextCompanyLabel ?? update.companyLabel,
        },
        select: { id: true, companyId: true, companyLabel: true, path: true },
      });

      return { update: saved };
    },
  };
}

async function upsertIgnoredDiscoveredHost(
  tx: Prisma.TransactionClient,
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

  const existing = await tx.remoteDiscoveredHost.findFirst({
    where: {
      OR: [
        ...(linkedHostId ? [{ linkedHostId }] : []),
        ...(agentExternalId ? [{ agentExternalId }] : []),
        ...(machineName ? [{ machineName }] : []),
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    select: { id: true },
  });

  const data = {
    machineName,
    agentExternalId,
    provider: "portal",
    environment: "portal-removal",
    description: "Host removido do portal. Reinstale ou reautorize o agente antes de rematerializar este registro.",
    serviceStatus: "revoked",
    status: "IGNORED" as const,
    linkedHostId: null,
    linkedAt: null,
    lastHeartbeatAt: new Date(),
  };

  if (existing) {
    await tx.remoteDiscoveredHost.update({
      where: { id: existing.id },
      data,
    });
    return;
  }

  await tx.remoteDiscoveredHost.create({
    data,
  });
}




