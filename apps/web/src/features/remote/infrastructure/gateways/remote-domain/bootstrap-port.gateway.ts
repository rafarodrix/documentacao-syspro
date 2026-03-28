import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings-server";
import {
  buildAgentToken,
  buildRustDeskConfigProfile,
  hashAgentToken,
  hashRustDeskPublicKey,
  normalizeRustdeskId,
  resolveRustDeskAlias,
} from "@/features/remote/application/rustdesk-sync";
import { getRemoteAgentTokenExpiresAt } from "@/features/remote/application/agent-token";
import type { RemoteBootstrapPort } from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
};

export function createRemoteBootstrapPort(params: { logger: RemoteLogger; requestIp: string | null }): RemoteBootstrapPort {
  const { logger, requestIp } = params;

  return {
    async resolveHostByInstallToken(installToken: string) {
      const host = await prisma.remoteHost.findFirst({
        where: { installToken },
        include: {
          company: {
            select: {
              nomeFantasia: true,
              razaoSocial: true,
            },
          },
        },
      });

      if (!host) return null;

      return {
        hostId: host.id,
        hostName: host.name,
        companyId: host.companyId,
        companyName: host.company.nomeFantasia ?? host.company.razaoSocial,
        agentExternalId: host.agentExternalId,
        machineName: host.machineName,
        agentVersion: host.agentVersion,
        environment: host.environment,
        lastKnownIp: host.lastKnownIp,
      };
    },
    async getConfigProfile() {
      const settings = await getRemoteModuleSettingsSnapshot();
      const configProfile = buildRustDeskConfigProfile(settings);
      return {
        serverHost: configProfile.serverHost,
        apiHost: configProfile.apiHost,
        publicKey: configProfile.publicKey,
        publicKeyHash: configProfile.publicKeyHash,
        serverConfig: configProfile.serverConfig,
        targetVersion: configProfile.targetVersion,
        defaultPassword: configProfile.defaultPassword,
      };
    },
    async issueAgentToken() {
      const token = buildAgentToken();
      return {
        token,
        tokenHash: hashAgentToken(token),
        issuedAt: new Date(),
      };
    },
    hashPublicKey(publicKey: string) {
      return hashRustDeskPublicKey(publicKey);
    },
    resolveAlias(input) {
      return resolveRustDeskAlias({
        hostName: input.hostName,
        machineName: input.machineName,
        companyName: input.companyName,
      });
    },
    getAgentTokenExpiresAt(issuedAt: Date | null) {
      return getRemoteAgentTokenExpiresAt(issuedAt);
    },
    async saveProcessedBootstrap(record) {
      const updatedHost = await prisma.remoteHost.update({
        where: { id: record.host.hostId },
        data: {
          agentExternalId: normalizeRustdeskId(record.rustdeskId) || record.host.agentExternalId,
          machineName: record.machineName,
          agentVersion: record.input.agentVersion ?? record.host.agentVersion,
          environment: record.input.environment ?? record.host.environment,
          agentTokenHash: record.issuedToken.tokenHash,
          agentTokenIssuedAt: record.issuedToken.issuedAt,
          agentTokenLastUsedAt: record.issuedToken.issuedAt,
          lastHeartbeatAt: record.issuedToken.issuedAt,
          lastHeartbeatSuccessAt: record.issuedToken.issuedAt,
          lastHeartbeatErrorAt: null,
          lastHeartbeatErrorMessage: null,
          lastKnownIp: requestIp || record.host.lastKnownIp,
          lastRegisterAt: record.issuedToken.issuedAt,
          lastRegisterSource: "rustdesk.bootstrap",
          lastKnownRustDeskAlias: record.input.currentAlias ?? record.alias,
          lastKnownRustDeskVersion: record.input.currentVersion ?? record.configProfile.targetVersion,
          lastKnownRustDeskServerHost: record.input.serverHost ?? record.configProfile.serverHost,
          lastKnownRustDeskApiHost: record.input.apiHost ?? record.configProfile.apiHost,
          lastKnownRustDeskPublicKeyHash: record.reportedPublicKeyHash ?? record.configProfile.publicKeyHash,
          lastRustDeskConfigSyncAt: record.issuedToken.issuedAt,
          status: "ACTIVE",
        },
        select: {
          id: true,
          companyId: true,
          agentExternalId: true,
          machineName: true,
          agentVersion: true,
          environment: true,
          agentTokenIssuedAt: true,
          lastKnownRustDeskAlias: true,
          lastKnownRustDeskVersion: true,
          lastKnownRustDeskServerHost: true,
          lastKnownRustDeskApiHost: true,
          lastKnownRustDeskPublicKeyHash: true,
          lastRustDeskConfigSyncAt: true,
        },
      });

      return updatedHost;
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
  };
}
