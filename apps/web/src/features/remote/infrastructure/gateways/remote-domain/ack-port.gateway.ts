import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashAgentToken } from "@/features/remote/application/rustdesk-sync";
import { isRemoteAgentTokenExpired } from "@/features/remote/application/agent-token";
import type { RemoteAckPort } from "@dosc-syspro/remote-domain";

type RemoteLogger = {
  info(event: string, fields?: Record<string, unknown>): void;
};

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export function createRemoteAckPort(params: { logger: RemoteLogger }): RemoteAckPort {
  const { logger } = params;

  return {
    async resolveHostByAgentToken(agentToken: string) {
      const host = await prisma.remoteHost.findFirst({
        where: {
          agentTokenHash: hashAgentToken(agentToken),
        },
        select: {
          id: true,
          agentTokenIssuedAt: true,
        },
      });

      if (!host) return null;
      return {
        hostId: host.id,
        agentTokenIssuedAt: host.agentTokenIssuedAt,
      };
    },
    isAgentTokenExpired(issuedAt: Date | null) {
      return isRemoteAgentTokenExpired(issuedAt);
    },
    async findDeliverableCommand(hostId: string, commandId: string) {
      const command = await prisma.remoteAgentCommand.findFirst({
        where: {
          id: commandId,
          hostId,
          status: {
            in: ["PENDING", "DELIVERED"],
          },
        },
        select: {
          id: true,
          type: true,
        },
      });

      return command;
    },
    async persistAck(record) {
      await prisma.remoteAgentCommand.update({
        where: { id: record.commandId },
        data: {
          status: record.status,
          executedAt: record.executedAt,
          resultMessage: record.message,
          resultPayload: record.details ? toJsonValue(record.details) : undefined,
          failedAt: record.status === "FAILED" ? record.executedAt : null,
        },
      });
    },
    async logInfo(event: string, fields: Record<string, unknown>) {
      logger.info(event, fields);
    },
  };
}
