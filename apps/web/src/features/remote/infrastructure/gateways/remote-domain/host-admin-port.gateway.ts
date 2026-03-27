import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizeCompareValue,
  normalizeSysproUpdates,
  syncRemoteHostSysproUpdates,
} from "@/features/remote/application/agent-payload";
import type {
  CreateHostInput,
  CreateHostOutput,
  DeleteHostInput,
  DeleteHostOutput,
  HostAgentTokenInput,
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

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function buildInstallToken() {
  return `rhost_${randomBytes(12).toString("hex")}`;
}

function normalizeRustdeskIdStrict(value?: string | null) {
  const digitsOnly = (value ?? "").replace(/\D/g, "").trim();
  if (!digitsOnly) return null;
  return /^\d{7,12}$/.test(digitsOnly) ? digitsOnly : null;
}

function withDataError(message: string, data?: unknown) {
  const error = new Error(message) as Error & { data?: unknown };
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

export function createRemoteHostAdminPort(): RemoteHostAdminPort {
  return {
    async linkDiscoveredHost(input: LinkDiscoveredHostInput): Promise<LinkDiscoveredHostOutput> {
      if (!input.scope.isGlobalView && !input.scope.companyIds.includes(input.companyId)) {
        throw new Error("HOST_COMPANY_OUT_OF_SCOPE");
      }

      const [company, discoveredHost] = await Promise.all([
        prisma.company.findFirst({
          where: { id: input.companyId, deletedAt: null },
          select: { id: true, nomeFantasia: true, razaoSocial: true },
        }),
        prisma.remoteDiscoveredHost.findFirst({ where: { id: input.discoveredHostId } }),
      ]);

      if (!company) {
        throw new Error("HOST_COMPANY_NOT_FOUND");
      }

      if (!discoveredHost) {
        throw new Error("DISCOVERED_HOST_NOT_FOUND");
      }

      if (discoveredHost.linkedHostId) {
        return {
          hostId: discoveredHost.linkedHostId,
          discoveredHostId: discoveredHost.id,
          created: false,
        };
      }

      const heartbeatAt = discoveredHost.lastHeartbeatAt ?? new Date();
      const normalizedPrimaryNames = [
        normalizeCompareValue(company.nomeFantasia),
        normalizeCompareValue(company.razaoSocial),
      ].filter(Boolean);
      const sysproUpdates = normalizeSysproUpdates(discoveredHost.installationsSnapshot);

      const host = await prisma.$transaction(async (tx) => {
        const createdHost = await tx.remoteHost.create({
          data: {
            companyId: input.companyId,
            name: input.name,
            provider: discoveredHost.provider?.trim() || "RustDesk",
            environment: discoveredHost.environment?.trim() || null,
            description: input.description?.trim() || discoveredHost.description?.trim() || null,
            agentExternalId: discoveredHost.agentExternalId?.trim() || null,
            installToken: buildInstallToken(),
            machineName: discoveredHost.machineName?.trim() || null,
            agentVersion: discoveredHost.agentVersion?.trim() || null,
            serviceStatus: discoveredHost.serviceStatus?.trim() || null,
            lastHeartbeatAt: heartbeatAt,
            status: "ACTIVE",
          },
          select: { id: true, companyId: true },
        });

        await syncRemoteHostSysproUpdates(tx, {
          hostId: createdHost.id,
          hostCompanyId: input.companyId,
          hostCompanyNames: normalizedPrimaryNames,
          heartbeatAt,
          sysproUpdates,
        });

        await tx.remoteDiscoveredHost.update({
          where: { id: discoveredHost.id },
          data: {
            linkedHostId: createdHost.id,
            linkedAt: new Date(),
            status: "LINKED",
          },
        });

        return createdHost;
      });

      return {
        hostId: host.id,
        discoveredHostId: discoveredHost.id,
        created: true,
      };
    },

    async createHost(input: CreateHostInput): Promise<CreateHostOutput> {
      if (!input.scope.isGlobalView && !input.scope.companyIds.includes(input.companyId)) {
        throw new Error("HOST_COMPANY_OUT_OF_SCOPE");
      }

      const company = await prisma.company.findFirst({
        where: { id: input.companyId, deletedAt: null },
        select: { id: true },
      });

      if (!company) {
        throw new Error("HOST_COMPANY_NOT_FOUND");
      }

      const incomingAgentExternalId = input.agentExternalId?.trim();
      const agentExternalId = normalizeRustdeskIdStrict(incomingAgentExternalId);
      if (incomingAgentExternalId && !agentExternalId) {
        throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
      }

      if (agentExternalId) {
        const existingHost = await prisma.remoteHost.findFirst({
          where: { agentExternalId },
          select: {
            id: true,
            company: { select: { nomeFantasia: true, razaoSocial: true } },
          },
        });

        if (existingHost) {
          const companyLabel = existingHost.company.nomeFantasia ?? existingHost.company.razaoSocial ?? "empresa";
          throw withDataError("HOST_AGENT_EXTERNAL_ID_CONFLICT", { companyLabel });
        }
      }

      const host = await prisma.remoteHost.create({
        data: {
          companyId: input.companyId,
          name: input.name,
          machineName: input.machineName?.trim() || null,
          environment: input.environment?.trim() || null,
          provider: input.provider?.trim() || "RustDesk",
          description: input.description?.trim() || null,
          notes: input.notes?.trim() || null,
          agentExternalId,
          status: input.status ?? "ACTIVE",
        },
      });

      return { host };
    },

    async updateHost(input: UpdateHostInput): Promise<UpdateHostOutput> {
      if (!input.scope.isGlobalView && !input.scope.companyIds.includes(input.companyId)) {
        throw new Error("HOST_COMPANY_OUT_OF_SCOPE");
      }

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

      const company = await prisma.company.findFirst({
        where: { id: input.companyId, deletedAt: null },
        select: { id: true },
      });

      if (!company) {
        throw new Error("HOST_COMPANY_NOT_FOUND");
      }

      const incomingAgentExternalId = input.agentExternalId?.trim();
      const agentExternalId = normalizeRustdeskIdStrict(incomingAgentExternalId);
      if (incomingAgentExternalId && !agentExternalId) {
        throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
      }

      if (agentExternalId) {
        const duplicate = await prisma.remoteHost.findFirst({
          where: {
            agentExternalId,
            id: { not: input.hostId },
          },
          select: {
            id: true,
            company: { select: { nomeFantasia: true, razaoSocial: true } },
          },
        });

        if (duplicate) {
          const companyLabel = duplicate.company.nomeFantasia ?? duplicate.company.razaoSocial ?? "empresa";
          throw withDataError("HOST_AGENT_EXTERNAL_ID_CONFLICT", { companyLabel });
        }
      }

      const host = await prisma.remoteHost.update({
        where: { id: input.hostId },
        data: {
          companyId: input.companyId,
          name: input.name,
          machineName: input.machineName?.trim() || null,
          environment: input.environment?.trim() || null,
          provider: input.provider?.trim() || null,
          description: input.description?.trim() || null,
          notes: input.notes?.trim() || null,
          agentExternalId,
          status: input.status ?? "ACTIVE",
        },
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
        include: {
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

      await prisma.remoteHost.delete({ where: { id: input.hostId } });
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
        const company = await prisma.company.findFirst({
          where: {
            id: targetCompanyId,
            deletedAt: null,
            ...(input.scope.isGlobalView ? {} : { id: { in: input.scope.companyIds.length ? input.scope.companyIds : ["__none__"] } }),
          },
          select: { id: true, nomeFantasia: true, razaoSocial: true },
        });

        if (!company) {
          throw new Error("HOST_COMPANY_NOT_FOUND");
        }

        nextCompanyId = company.id;
        nextCompanyLabel = company.nomeFantasia ?? company.razaoSocial;
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


