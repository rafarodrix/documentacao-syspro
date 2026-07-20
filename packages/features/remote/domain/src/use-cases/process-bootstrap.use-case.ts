import { processBootstrapInputSchema, type ProcessBootstrapInput, type ProcessBootstrapOutput } from "../remote-domain.contracts";
import type { RemoteBootstrapDiscoveryContext, RemoteBootstrapHostContext, RemoteBootstrapPort } from "../remote-domain.port";

function normalizeNullable(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function assertHostBootstrapAuthorization(
  host: RemoteBootstrapHostContext,
  input: ProcessBootstrapInput,
  now: Date,
) {
  if (
    host.discoveryStatus !== "LINKED" ||
    !host.bootstrapAuthorizedUntil ||
    host.bootstrapAuthorizedUntil.getTime() < now.getTime()
  ) {
    throw new Error("INSTALL_TOKEN_DISCOVERY_REQUIRED");
  }

  const inputRustdeskId = normalizeComparable(input.rustdeskId);
  const discoveredRustdeskId = normalizeComparable(host.discoveryAgentExternalId);
  if (inputRustdeskId && discoveredRustdeskId && inputRustdeskId !== discoveredRustdeskId) {
    throw new Error("INSTALL_TOKEN_IDENTITY_MISMATCH");
  }

  const inputMachineName = normalizeComparable(input.machineName);
  const discoveredMachineName = normalizeComparable(host.discoveryMachineName);
  if (inputMachineName && discoveredMachineName && inputMachineName !== discoveredMachineName) {
    throw new Error("INSTALL_TOKEN_IDENTITY_MISMATCH");
  }
}

function assertDiscoveryBootstrapAuthorization(
  discovery: RemoteBootstrapDiscoveryContext,
  input: ProcessBootstrapInput,
  expectedToken: string | null,
  now: Date,
) {
  if (!expectedToken || input.discoveryToken !== expectedToken) {
    throw new Error("DISCOVERY_TOKEN_INVALID");
  }

  if (
    discovery.discoveryStatus !== "PENDING_LINK" ||
    !discovery.discoveryLastHeartbeatAt ||
    discovery.discoveryLastHeartbeatAt.getTime() + 30 * 60 * 1000 < now.getTime()
  ) {
    throw new Error("DISCOVERY_BOOTSTRAP_DISCOVER_REQUIRED");
  }

  const inputRustdeskId = normalizeComparable(input.rustdeskId);
  const discoveredRustdeskId = normalizeComparable(discovery.discoveryAgentExternalId);
  if (inputRustdeskId && discoveredRustdeskId && inputRustdeskId !== discoveredRustdeskId) {
    throw new Error("DISCOVERY_BOOTSTRAP_IDENTITY_MISMATCH");
  }

  const inputMachineName = normalizeComparable(input.machineName);
  const discoveredMachineName = normalizeComparable(discovery.discoveryMachineName);
  if (inputMachineName && discoveredMachineName && inputMachineName !== discoveredMachineName) {
    throw new Error("DISCOVERY_BOOTSTRAP_IDENTITY_MISMATCH");
  }
}

function resolveDiscoveryAlias(machineName: string | null, rustdeskId: string | null) {
  return machineName?.trim() || rustdeskId?.trim() || "Trilink Agent";
}

function normalizeInput(input: ProcessBootstrapInput): ProcessBootstrapInput {
  return {
    ...input,
    installToken: input.installToken?.trim(),
    discoveryToken: input.discoveryToken?.trim(),
    discoveredHostId: input.discoveredHostId?.trim(),
    rustdeskId: normalizeNullable(input.rustdeskId),
    machineName: normalizeNullable(input.machineName),
    agentVersion: normalizeNullable(input.agentVersion),
    environment: normalizeNullable(input.environment),
    currentAlias: normalizeNullable(input.currentAlias),
    currentVersion: normalizeNullable(input.currentVersion),
    serverHost: normalizeNullable(input.serverHost),
    apiHost: normalizeNullable(input.apiHost),
    publicKey: normalizeNullable(input.publicKey),
  };
}

export async function processBootstrap(
  payload: unknown,
  deps: {
    port: RemoteBootstrapPort;
    requestIp?: string | null;
    now?: () => Date;
  },
): Promise<ProcessBootstrapOutput> {
  const parsed = processBootstrapInputSchema.parse(payload);
  const input = normalizeInput(parsed);

  const now = deps.now ? deps.now() : new Date();

  const configProfile = await deps.port.getConfigProfile();
  const reportedPublicKeyHash = input.publicKey ? deps.port.hashPublicKey(input.publicKey) : null;

  if (input.installToken) {
    const host = await deps.port.resolveHostByInstallToken(input.installToken);
    if (!host) {
      throw new Error("INSTALL_TOKEN_INVALID");
    }

    try {
      assertHostBootstrapAuthorization(host, input, now);
    } catch (error) {
      await deps.port.logWarning("remote.domain.bootstrap.authorization_blocked", {
        hostId: host.hostId,
        companyId: host.companyId,
        installTokenPresent: true,
        discoveryStatus: host.discoveryStatus,
        discoveryAgentExternalId: host.discoveryAgentExternalId,
        discoveryMachineName: host.discoveryMachineName,
        discoveryLastHeartbeatAt: host.discoveryLastHeartbeatAt?.toISOString() ?? null,
        bootstrapAuthorizedUntil: host.bootstrapAuthorizedUntil?.toISOString() ?? null,
        requestRustdeskId: input.rustdeskId ?? null,
        requestMachineName: input.machineName ?? null,
        reason: error instanceof Error ? error.message : "INSTALL_TOKEN_DISCOVERY_REQUIRED",
      });
      throw error;
    }

    const issuedToken = await deps.port.issueAgentToken();
    const rustdeskId = deps.port.normalizeRustdeskId(input.rustdeskId) ?? host.agentExternalId;
    const machineName = input.machineName ?? host.machineName;
    const alias = deps.port.resolveAlias({
      hostName: host.hostName,
      machineName,
      companyName: host.companyName,
    });

    const persisted = await deps.port.saveProcessedBootstrap({
      host,
      input,
      rustdeskId,
      machineName,
      alias,
      configProfile,
      issuedToken,
      reportedPublicKeyHash,
      requestIp: deps.requestIp ?? null,
    });

    await deps.port.logInfo("remote.domain.bootstrap.succeeded", {
      hostId: persisted.id,
      companyId: persisted.companyId,
      rustdeskId: persisted.agentExternalId,
    });

    const compliance = {
      aliasMatch: normalizeComparable(persisted.lastKnownRustDeskAlias) === normalizeComparable(alias),
      versionMatch: normalizeComparable(persisted.lastKnownRustDeskVersion) === normalizeComparable(configProfile.targetVersion),
      serverHostMatch:
        normalizeComparable(persisted.lastKnownRustDeskServerHost) === normalizeComparable(configProfile.serverHost),
      apiHostMatch: normalizeComparable(persisted.lastKnownRustDeskApiHost) === normalizeComparable(configProfile.apiHost),
      publicKeyMatch:
        normalizeComparable(persisted.lastKnownRustDeskPublicKeyHash) === normalizeComparable(configProfile.publicKeyHash),
    };

    return {
      contractVersion: "rustdesk.bootstrap.v1",
      bootstrapMode: "host",
      hostId: persisted.id,
      companyId: persisted.companyId,
      companyName: host.companyName,
      alias,
      rustdeskId: persisted.agentExternalId,
      machineName: persisted.machineName,
      agentToken: issuedToken.token,
      agentTokenIssuedAt: persisted.agentTokenIssuedAt?.toISOString() ?? null,
      agentTokenExpiresAt: deps.port.getAgentTokenExpiresAt(persisted.agentTokenIssuedAt)?.toISOString() ?? null,
      serverHost: configProfile.serverHost,
      apiHost: configProfile.apiHost,
      publicKey: configProfile.publicKey,
      publicKeyHash: configProfile.publicKeyHash,
      serverConfig: configProfile.serverConfig,
      targetVersion: configProfile.targetVersion,
      defaultPassword: configProfile.defaultPassword,
      autoInstall: configProfile.autoInstall,
      autoUpgrade: configProfile.autoUpgrade,
      installerUrl: configProfile.installerUrl,
      installerChecksumSha256: configProfile.installerChecksumSha256,
      installerPackageType: configProfile.installerPackageType,
      installerSilentArgs: configProfile.installerSilentArgs,
      restartServiceAfterApply: configProfile.restartServiceAfterApply,
      suppressTrayShortcuts: configProfile.suppressTrayShortcuts,
      hideTray: configProfile.hideTray,
      hideStopService: configProfile.hideStopService,
      allowRemoteConfigModification: configProfile.allowRemoteConfigModification,
      allowD3DRender: configProfile.allowD3DRender,
      enableDirectXCapture: configProfile.enableDirectXCapture,
      compliance,
      flow: {
        stage: "BOOTSTRAPPED",
        nextStep: "call_sync_with_agent_token",
        nextEndpoint: "/api/remote/rustdesk/sync",
        discoverRole: "triage_only",
      },
      actions: ["bootstrap_complete"],
    };
  }

  const expectedToken = deps.port.getExpectedDiscoveryToken();
  const discovery = await deps.port.resolvePendingBootstrapByDiscovery(input.discoveredHostId ?? "");
  if (!discovery) {
    throw new Error("DISCOVERED_HOST_NOT_FOUND");
  }

  try {
    assertDiscoveryBootstrapAuthorization(discovery, input, expectedToken, now);
  } catch (error) {
    await deps.port.logWarning("remote.domain.bootstrap.discovery_authorization_blocked", {
      discoveredHostId: discovery.discoveredHostId,
      discoveryStatus: discovery.discoveryStatus,
      discoveryAgentExternalId: discovery.discoveryAgentExternalId,
      discoveryMachineName: discovery.discoveryMachineName,
      discoveryLastHeartbeatAt: discovery.discoveryLastHeartbeatAt?.toISOString() ?? null,
      requestRustdeskId: input.rustdeskId ?? null,
      requestMachineName: input.machineName ?? null,
      reason: error instanceof Error ? error.message : "DISCOVERY_BOOTSTRAP_DISCOVER_REQUIRED",
    });
    throw error;
  }

  const rustdeskId = deps.port.normalizeRustdeskId(input.rustdeskId) ?? discovery.discoveryAgentExternalId;
  const machineName = input.machineName ?? discovery.discoveryMachineName;
  const alias = resolveDiscoveryAlias(machineName, rustdeskId);
  const compliance = {
    aliasMatch: !normalizeComparable(input.currentAlias) || normalizeComparable(input.currentAlias) === normalizeComparable(alias),
    versionMatch:
      !normalizeComparable(input.currentVersion) ||
      normalizeComparable(input.currentVersion) === normalizeComparable(configProfile.targetVersion),
    serverHostMatch:
      !normalizeComparable(input.serverHost) ||
      normalizeComparable(input.serverHost) === normalizeComparable(configProfile.serverHost),
    apiHostMatch:
      !normalizeComparable(input.apiHost) ||
      normalizeComparable(input.apiHost) === normalizeComparable(configProfile.apiHost),
    publicKeyMatch:
      !normalizeComparable(reportedPublicKeyHash) ||
      normalizeComparable(reportedPublicKeyHash) === normalizeComparable(configProfile.publicKeyHash),
  };

  await deps.port.logInfo("remote.domain.bootstrap.discovery_succeeded", {
    discoveredHostId: discovery.discoveredHostId,
    rustdeskId,
    machineName,
  });

  return {
    contractVersion: "rustdesk.bootstrap.v1",
    bootstrapMode: "discovery",
    hostId: null,
    companyId: null,
    companyName: null,
    alias,
    rustdeskId,
    machineName,
    agentToken: null,
    agentTokenIssuedAt: null,
    agentTokenExpiresAt: null,
    serverHost: configProfile.serverHost,
    apiHost: configProfile.apiHost,
    publicKey: configProfile.publicKey,
    publicKeyHash: configProfile.publicKeyHash,
    serverConfig: configProfile.serverConfig,
    targetVersion: configProfile.targetVersion,
    defaultPassword: configProfile.defaultPassword,
    autoInstall: configProfile.autoInstall,
    autoUpgrade: configProfile.autoUpgrade,
    installerUrl: configProfile.installerUrl,
    installerChecksumSha256: configProfile.installerChecksumSha256,
    installerPackageType: configProfile.installerPackageType,
    installerSilentArgs: configProfile.installerSilentArgs,
    restartServiceAfterApply: configProfile.restartServiceAfterApply,
    suppressTrayShortcuts: configProfile.suppressTrayShortcuts,
    hideTray: configProfile.hideTray,
    hideStopService: configProfile.hideStopService,
    allowRemoteConfigModification: configProfile.allowRemoteConfigModification,
    allowD3DRender: configProfile.allowD3DRender,
    enableDirectXCapture: configProfile.enableDirectXCapture,
    compliance,
    flow: {
      stage: "AWAITING_LINK",
      nextStep: "continue_discover_until_linked",
      nextEndpoint: "/api/remote/agents/discover",
      discoverRole: "triage_only",
    },
    actions: ["bootstrap_complete", "await_link"],
  };
}
