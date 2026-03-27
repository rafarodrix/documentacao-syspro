import { processDiscoverInputSchema, type ProcessDiscoverOutput } from "../contracts";
import type { RemoteDiscoverPort } from "../ports";

function normalizeNullable(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

export async function processDiscover(
  payload: unknown,
  deps: {
    port: RemoteDiscoverPort;
    now?: () => Date;
  },
): Promise<ProcessDiscoverOutput> {
  const input = processDiscoverInputSchema.parse(payload);

  const expectedToken = deps.port.getExpectedDiscoveryToken();
  if (!expectedToken) {
    throw new Error("DISCOVERY_TOKEN_NOT_CONFIGURED");
  }

  if (input.discoveryToken !== expectedToken) {
    throw new Error("DISCOVERY_TOKEN_INVALID");
  }

  const rustdeskId = deps.port.normalizeRustdeskId(input.rustdeskId);
  const machineName = normalizeNullable(input.machineName);
  if (!rustdeskId && !machineName) {
    throw new Error("DISCOVERY_ID_OR_MACHINE_REQUIRED");
  }

  const heartbeatAt = deps.now ? deps.now() : new Date();
  const normalizedUpdates = deps.port.normalizeSysproUpdates(input.sysproUpdates);
  const serviceStatus = normalizeNullable(input.serviceStatus);
  const transitions = deps.port.getTransitions();

  const discoveredHost = await deps.port.findDiscoveredHost({
    rustdeskId,
    machineName,
  });

  if (discoveredHost?.linkedHostId) {
    const linkedHost = await deps.port.findLinkedHost(discoveredHost.linkedHostId);

    if (linkedHost) {
      await deps.port.updateDiscoveredHost(discoveredHost.id, {
        machineName,
        agentExternalId: rustdeskId,
        agentVersion: normalizeNullable(input.agentVersion),
        environment: normalizeNullable(input.environment),
        provider: normalizeNullable(input.provider) ?? "RustDesk",
        description: normalizeNullable(input.description),
        serviceStatus,
        installationsSnapshot: deps.port.serializeSysproUpdatesSnapshot(normalizedUpdates),
        lastHeartbeatAt: heartbeatAt,
        linkedAt: discoveredHost.linkedAt ?? heartbeatAt,
        status: "LINKED",
      });

      const bootstrapRequired =
        !linkedHost.agentTokenHash ||
        !!linkedHost.lastHeartbeatErrorMessage?.toLowerCase().match(/agenttoken (invalido|expirado|rotacionado|indisponivel)/);

      return {
        contractVersion: "discover.v2",
        mode: "linked",
        discoveredHostId: discoveredHost.id,
        hostId: linkedHost.id,
        hostName: linkedHost.name,
        heartbeatAuth: "agentToken",
        bootstrapFlow: bootstrapRequired ? "host_installer_required" : "linked_host_detected",
        transition: bootstrapRequired ? transitions.host_installer_required : transitions.linked_host_detected,
        message: bootstrapRequired
          ? "Esta maquina ja esta vinculada a um host do portal. O fluxo discover nao emite agentToken; execute o instalador dedicado do host para concluir o bootstrap."
          : "Esta maquina ja esta vinculada a um host do portal. O fluxo discover continua apenas como descoberta e nao substitui o heartbeat autenticado do host.",
      };
    }
  }

  const payloadToPersist = {
    machineName,
    agentExternalId: rustdeskId ?? null,
    agentVersion: normalizeNullable(input.agentVersion),
    environment: normalizeNullable(input.environment),
    provider: normalizeNullable(input.provider) ?? "RustDesk",
    description: normalizeNullable(input.description),
    serviceStatus,
    installationsSnapshot: deps.port.serializeSysproUpdatesSnapshot(normalizedUpdates),
    lastHeartbeatAt: heartbeatAt,
    status: "PENDING_LINK" as const,
  };

  const record = discoveredHost
    ? await deps.port.updateDiscoveredHost(discoveredHost.id, payloadToPersist)
    : await deps.port.createDiscoveredHost(payloadToPersist);

  return {
    contractVersion: "discover.v2",
    mode: "pending",
    discoveredHostId: record.id,
    heartbeatAuth: "discoveryToken",
    bootstrapFlow: "pending_link",
    transition: transitions.pending_link,
    message:
      "Maquina descoberta com sucesso. Este fluxo serve apenas para triagem inicial; depois do vinculo, use o instalador do host para emitir agentToken.",
  };
}
