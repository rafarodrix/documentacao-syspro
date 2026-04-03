import { processAckInputSchema, type ProcessAckOutput } from "../contracts";
import type { RemoteAckPort } from "../ports";

function normalizeMessage(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeReasonCode(value?: string | null): string | null {
  const next = value?.trim().toUpperCase();
  return next ? next : null;
}

export async function processAck(
  payload: unknown,
  deps: {
    port: RemoteAckPort;
    now?: () => Date;
  },
): Promise<ProcessAckOutput> {
  const input = processAckInputSchema.parse(payload);
  const reasonCode = normalizeReasonCode(input.reasonCode) ?? (input.status === "FAILED" ? null : "COMMAND_PROCESSED");
  if (input.status === "FAILED" && !reasonCode) {
    throw new Error("ACK_REASON_CODE_REQUIRED");
  }

  const host = await deps.port.resolveHostByAgentToken(input.agentToken);
  if (!host) {
    throw new Error("AGENT_TOKEN_INVALID");
  }

  if (deps.port.isAgentTokenExpired(host.agentTokenIssuedAt)) {
    throw new Error("AGENT_TOKEN_EXPIRED");
  }

  const command = await deps.port.findDeliverableCommand(host.hostId, input.commandId);
  if (!command) {
    throw new Error("COMMAND_NOT_FOUND");
  }

  const executedAt = deps.now ? deps.now() : new Date();

  await deps.port.persistAck({
    hostId: host.hostId,
    commandId: command.id,
    status: input.status,
    reasonCode: reasonCode!,
    message: normalizeMessage(input.message),
    details: input.details ?? null,
    executedAt,
  });

  await deps.port.logInfo("remote.domain.ack.succeeded", {
    hostId: host.hostId,
    commandId: command.id,
    commandType: command.type,
    status: input.status,
  });

  return {
    commandId: command.id,
    status: input.status,
    reasonCode: reasonCode!,
    executedAt: executedAt.toISOString(),
  };
}


