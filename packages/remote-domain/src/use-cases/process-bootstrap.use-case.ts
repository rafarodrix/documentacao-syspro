import { processBootstrapInputSchema, type ProcessBootstrapInput, type ProcessBootstrapOutput } from "../remote-domain.contracts";
import type { RemoteBootstrapPort } from "../remote-domain.port";

function normalizeNullable(value?: string | null): string | null {
  const next = value?.trim();
  return next ? next : null;
}

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeInput(input: ProcessBootstrapInput): ProcessBootstrapInput {
  return {
    ...input,
    installToken: input.installToken.trim(),
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
  },
): Promise<ProcessBootstrapOutput> {
  const parsed = processBootstrapInputSchema.parse(payload);
  const input = normalizeInput(parsed);

  const host = await deps.port.resolveHostByInstallToken(input.installToken);
  if (!host) {
    throw new Error("INSTALL_TOKEN_INVALID");
  }

  const configProfile = await deps.port.getConfigProfile();
  const issuedToken = await deps.port.issueAgentToken();

  const rustdeskId = input.rustdeskId ?? host.agentExternalId;
  const machineName = input.machineName ?? host.machineName;
  const alias = deps.port.resolveAlias({
    hostName: host.hostName,
    machineName,
    companyName: host.companyName,
  });

  const reportedPublicKeyHash = input.publicKey ? deps.port.hashPublicKey(input.publicKey) : null;

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
