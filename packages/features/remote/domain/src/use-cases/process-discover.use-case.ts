import { processDiscoverInputSchema, type ProcessDiscoverOutput } from "../remote-domain.contracts";
import type { RemoteDiscoverPort } from "../remote-domain.port";

function normalizeNullable(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function resolveLinkedBootstrapState(input: {
  agentTokenHash: string | null;
  lastHeartbeatErrorMessage: string | null;
}) {
  const hasMissingToken = !input.agentTokenHash;
  const hasInvalidToken =
    !hasMissingToken &&
    !!input.lastHeartbeatErrorMessage
      ?.toLowerCase()
      .match(/agenttoken (invalido|expirado|rotacionado|indisponivel)/);

  const bootstrapFlow = hasMissingToken
    ? "host_bootstrap_required"
    : hasInvalidToken
      ? "token_invalid"
      : "linked_host_detected";

  return {
    bootstrapFlow,
    requiresBootstrapToken:
      bootstrapFlow === "host_bootstrap_required" ||
      bootstrapFlow === "token_invalid",
  };
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
  const serializedSnapshot = deps.port.serializeSysproUpdatesSnapshot(normalizedUpdates);
  const normalizedMetrics = deps.port.normalizeSystemMetrics(input.systemMetrics);
  const serviceStatus = normalizeNullable(input.serviceStatus);
  const transitions = deps.port.getTransitions();

  const discoveredHost = await deps.port.findDiscoveredHost({
    rustdeskId,
    machineName,
  });

  if (discoveredHost?.status === "IGNORED" && !discoveredHost.linkedHostId) {
    return {
      contractVersion: "discover.v2",
      mode: "pending",
      discoveredHostId: discoveredHost.id,
      heartbeatAuth: "discoveryToken",
      bootstrapFlow: "pending_link",
      transition: transitions.pending_link,
      message:
        "Esta maquina foi removida ou ignorada no portal. O discover nao vai rematerializar o host automaticamente ate nova autorizacao/reinstalacao operacional.",
    };
  }

  if (discoveredHost?.linkedHostId) {
    const linkedHost = await deps.port.findLinkedHost(discoveredHost.linkedHostId);

    if (linkedHost) {
      if (normalizedMetrics) {
        await deps.port.updateLinkedHostMetrics(linkedHost.id, normalizedMetrics);
      }

      const linkedPayload = {
        machineName,
        agentExternalId: rustdeskId,
        agentVersion: normalizeNullable(input.agentVersion),
        environment: normalizeNullable(input.environment),
        provider: normalizeNullable(input.provider) ?? "RustDesk",
        description: normalizeNullable(input.description),
        serviceStatus,
        installationsSnapshot: serializedSnapshot,
        systemMetrics: normalizedMetrics,
        lastHeartbeatAt: heartbeatAt,
        linkedAt: discoveredHost.linkedAt ?? heartbeatAt,
        status: "LINKED" as const,
        linkedHostId: linkedHost.id,
      };

      const record = discoveredHost.id
        ? await deps.port.updateDiscoveredHost(discoveredHost.id, linkedPayload)
        : await deps.port.createDiscoveredHost(linkedPayload);

      const { bootstrapFlow, requiresBootstrapToken } = resolveLinkedBootstrapState({
        agentTokenHash: linkedHost.agentTokenHash,
        lastHeartbeatErrorMessage: linkedHost.lastHeartbeatErrorMessage,
      });
      const installToken = requiresBootstrapToken
        ? await deps.port.issueBootstrapInstallToken(linkedHost.id)
        : null;

      const transition = bootstrapFlow === "host_bootstrap_required"
        ? transitions.host_bootstrap_required
        : bootstrapFlow === "token_invalid"
          ? transitions.token_invalid
          : transitions.linked_host_detected;

      const message = bootstrapFlow === "host_bootstrap_required"
        ? "Esta maquina ja esta vinculada a um host do portal, mas sem agentToken ativo. Execute o bootstrap autenticado para emitir nova credencial."
        : bootstrapFlow === "token_invalid"
          ? "Esta maquina ja esta vinculada, mas a credencial atual foi invalidada/expirada. Execute o bootstrap autenticado para renovar o agentToken."
          : "Esta maquina ja esta vinculada a um host do portal. O fluxo discover continua apenas como descoberta e nao substitui o heartbeat autenticado do host.";

      return {
        contractVersion: "discover.v2",
        mode: "linked",
        discoveredHostId: record.id,
        hostId: linkedHost.id,
        hostName: linkedHost.name,
        installToken: installToken ?? undefined,
        heartbeatAuth: "agentToken",
        bootstrapFlow,
        transition,
        message,
      };
    }
  }

  const autoLinked = await deps.port.tryAutoLinkDiscoveredHost({
    discoveredHostId: discoveredHost?.id ?? null,
    machineName,
    agentExternalId: rustdeskId,
    agentVersion: normalizeNullable(input.agentVersion),
    environment: normalizeNullable(input.environment),
    provider: normalizeNullable(input.provider) ?? "RustDesk",
    description: normalizeNullable(input.description),
    serviceStatus,
    installationsSnapshot: serializedSnapshot,
    lastHeartbeatAt: heartbeatAt,
  });

  if (autoLinked) {
    if (normalizedMetrics) {
      await deps.port.updateLinkedHostMetrics(autoLinked.hostId, normalizedMetrics);
    }

    const { bootstrapFlow, requiresBootstrapToken } = resolveLinkedBootstrapState({
      agentTokenHash: autoLinked.agentTokenHash,
      lastHeartbeatErrorMessage: autoLinked.lastHeartbeatErrorMessage,
    });
    const installToken = requiresBootstrapToken
      ? await deps.port.issueBootstrapInstallToken(autoLinked.hostId)
      : null;

    const transition = bootstrapFlow === "host_bootstrap_required"
      ? transitions.host_bootstrap_required
      : bootstrapFlow === "token_invalid"
        ? transitions.token_invalid
        : transitions.linked_host_detected;

    const message = bootstrapFlow === "host_bootstrap_required"
      ? "Maquina vinculada automaticamente por match unico de empresa. Execute o bootstrap autenticado para emitir nova credencial."
      : bootstrapFlow === "token_invalid"
        ? "Maquina vinculada automaticamente, mas a credencial atual foi invalidada/expirada. Execute o bootstrap autenticado para renovar o agentToken."
        : "Maquina vinculada automaticamente por match unico de empresa.";

    return {
      contractVersion: "discover.v2",
      mode: "linked",
      discoveredHostId: autoLinked.discoveredHostId,
      hostId: autoLinked.hostId,
      hostName: autoLinked.hostName,
      installToken: installToken ?? undefined,
      heartbeatAuth: "agentToken",
      bootstrapFlow,
      transition,
      message,
    };
  }

  const payloadToPersist = {
    machineName,
    agentExternalId: rustdeskId ?? null,
    agentVersion: normalizeNullable(input.agentVersion),
    environment: normalizeNullable(input.environment),
    provider: normalizeNullable(input.provider) ?? "RustDesk",
    description: normalizeNullable(input.description),
    serviceStatus,
    installationsSnapshot: serializedSnapshot,
    systemMetrics: normalizedMetrics,
    lastHeartbeatAt: heartbeatAt,
    status: "PENDING_LINK" as const,
    linkedHostId: null,
  };

  const record = discoveredHost && discoveredHost.id
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
      "Maquina descoberta com sucesso. Este fluxo serve apenas para triagem inicial; depois do vinculo, use o bootstrap autenticado do host para emitir agentToken.",
  };
}
