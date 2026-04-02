import { describe, expect, it, vi } from "vitest";
import { processDiscover } from "../src/use-cases/process-discover";
import { processSync } from "../src/use-cases/process-sync";
import type { RemoteDiscoverPort, RemoteSyncPort } from "../src/ports";

function buildSyncPort(overrides: Partial<RemoteSyncPort> = {}): RemoteSyncPort {
  const port: RemoteSyncPort = {
    resolveSyncContextByAgentToken: vi.fn(async () => ({
      hostId: "host-1",
      companyId: "company-1",
      hostName: "ERP-MATRIZ-01",
      companyName: "Empresa X",
      companyPrimaryNames: ["Empresa X"],
      agentExternalId: "21187620068",
      machineName: "ERP-MATRIZ-01",
      agentVersion: "1.4.6",
      serviceStatus: "running",
      lastKnownIp: "127.0.0.1",
      lastKnownRustDeskAlias: "EMPRESA X | ERP-MATRIZ-01",
      lastKnownRustDeskVersion: "1.4.6",
      lastKnownRustDeskServerHost: "acesso.trilinksoftware.com.br",
      lastKnownRustDeskApiHost: "acesso.trilinksoftware.com.br",
      lastKnownRustDeskPublicKeyHash: "pub-hash",
      agentTokenIssuedAt: new Date("2026-03-28T10:00:00.000Z"),
      agentTokenLastUsedAt: new Date("2026-03-28T10:05:00.000Z"),
    })),
    isAgentTokenExpired: vi.fn(() => false),
    getAgentTokenExpiresAt: vi.fn((issuedAt: Date | null) => (issuedAt ? new Date(issuedAt.getTime() + 86400000) : null)),
    getConfigProfile: vi.fn(async () => ({
      serverHost: "acesso.trilinksoftware.com.br",
      apiHost: "acesso.trilinksoftware.com.br",
      publicKey: "pub-key",
      publicKeyHash: "pub-hash",
      serverConfig: "cfg",
      targetVersion: "1.4.6",
    })),
    hashPublicKey: vi.fn(() => "pub-hash"),
    normalizeRustdeskId: vi.fn((value: string | null | undefined) => value ?? null),
    normalizeSysproUpdates: vi.fn(() => []),
    resolveAlias: vi.fn(() => "EMPRESA X | ERP-MATRIZ-01"),
    getInventorySnapshot: vi.fn(async () => ({ knownInstallations: 0, lastFullSnapshotAt: null })),
    persistSync: vi.fn(async () => ({
      host: {
        id: "host-1",
        agentExternalId: "21187620068",
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
        lastHeartbeatSuccessAt: new Date("2026-03-28T10:06:00.000Z"),
        agentTokenIssuedAt: new Date("2026-03-28T10:00:00.000Z"),
        agentTokenLastUsedAt: new Date("2026-03-28T10:06:00.000Z"),
        lastKnownRustDeskAlias: "EMPRESA X | ERP-MATRIZ-01",
        lastKnownRustDeskVersion: "1.4.6",
        lastKnownRustDeskServerHost: "acesso.trilinksoftware.com.br",
        lastKnownRustDeskApiHost: "acesso.trilinksoftware.com.br",
        lastKnownRustDeskPublicKeyHash: "pub-hash",
        lastRustDeskConfigSyncAt: new Date("2026-03-28T10:06:00.000Z"),
      },
      pendingCommands: [],
    })),
    logInfo: vi.fn(async () => {}),
    logWarning: vi.fn(async () => {}),
    ...overrides,
  };

  return port;
}

function buildDiscoverPort(overrides: Partial<RemoteDiscoverPort> = {}): RemoteDiscoverPort {
  const port: RemoteDiscoverPort = {
    getExpectedDiscoveryToken: vi.fn(() => "DISCOVERY_TOKEN"),
    normalizeRustdeskId: vi.fn((value: string | null | undefined) => value ?? null),
    normalizeSysproUpdates: vi.fn(() => []),
    serializeSysproUpdatesSnapshot: vi.fn(() => []),
    getTransitions: vi.fn(() => ({
      pending_link: {
        state: "PENDING_LINK",
        nextStep: "manual_link",
        nextEndpoint: "/api/remote/discovered-hosts/:id/link",
        allowDiscoveryHeartbeat: true,
        requiresAuthenticatedBootstrap: false,
      },
      linked_host_detected: {
        state: "LINKED",
        nextStep: "stop_discover",
        nextEndpoint: "/api/remote/rustdesk/sync",
        allowDiscoveryHeartbeat: false,
        requiresAuthenticatedBootstrap: false,
      },
      host_bootstrap_required: {
        state: "LINKED",
        nextStep: "bootstrap",
        nextEndpoint: "/api/remote/rustdesk/bootstrap",
        allowDiscoveryHeartbeat: false,
        requiresAuthenticatedBootstrap: true,
      },
    })),
    findDiscoveredHost: vi.fn(async () => ({
      id: "disc-1",
      linkedHostId: "host-1",
      linkedAt: new Date("2026-03-28T10:00:00.000Z"),
    })),
    findLinkedHost: vi.fn(async () => ({
      id: "host-1",
      name: "ERP-MATRIZ-01",
      agentTokenHash: "token-hash",
      lastHeartbeatErrorMessage: "agentToken rotacionado durante sync",
    })),
    updateDiscoveredHost: vi.fn(async () => ({ id: "disc-1" })),
    createDiscoveredHost: vi.fn(async () => ({ id: "disc-2" })),
    logInfo: vi.fn(async () => {}),
    logWarning: vi.fn(async () => {}),
    logError: vi.fn(async () => {}),
    ...overrides,
  };

  return port;
}

describe("agent token lifecycle", () => {
  it("accepts sync when token is valid", async () => {
    const port = buildSyncPort();

    const result = await processSync(
      {
        agentToken: "valid-token",
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
      },
      { port },
    );

    expect(result.hostId).toBe("host-1");
    expect(result.flow.stage).toBe("SYNC_ACTIVE");
    expect(port.persistSync).toHaveBeenCalledOnce();
  });

  it("emits payload warnings when extended sync blocks are invalid", async () => {
    const port = buildSyncPort();

    const result = await processSync(
      {
        agentToken: "valid-token",
        hardwareIdentity: "invalid",
        diskSnapshot: { drive: "C" },
        sysproProcesses: "invalid",
        windowsUpdateStatus: ["invalid"],
        rebootPending: "talvez",
      },
      { port },
    );

    expect(result.warnings).toEqual([
      "SYNC_INVALID_HARDWARE_IDENTITY",
      "SYNC_INVALID_DISK_SNAPSHOT",
      "SYNC_INVALID_SYSPRO_PROCESSES",
      "SYNC_INVALID_WINDOWS_UPDATE_STATUS",
      "SYNC_INVALID_REBOOT_PENDING",
    ]);

    expect(port.logWarning).toHaveBeenCalledWith(
      "remote.domain.sync.payload_warnings",
      expect.objectContaining({
        hostId: "host-1",
      }),
    );

    expect(port.persistSync).toHaveBeenCalledWith(
      expect.objectContaining({
        hardwareIdentity: null,
        diskSnapshot: [],
        sysproProcesses: [],
        windowsUpdateStatus: null,
        rebootPending: null,
      }),
    );
  });
  it("rejects sync when token is invalid", async () => {
    const port = buildSyncPort({
      resolveSyncContextByAgentToken: vi.fn(async () => null),
    });

    await expect(processSync({ agentToken: "invalid-token" }, { port })).rejects.toThrow("AGENT_TOKEN_INVALID");
  });

  it("rejects sync when token is expired", async () => {
    const port = buildSyncPort({
      isAgentTokenExpired: vi.fn(() => true),
    });

    await expect(processSync({ agentToken: "expired-token" }, { port })).rejects.toThrow("AGENT_TOKEN_EXPIRED");
  });

  it("flags rotated token as bootstrap required during discover", async () => {
    const port = buildDiscoverPort();

    const result = await processDiscover(
      {
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("linked");
    expect(result.bootstrapFlow).toBe("host_bootstrap_required");
    expect(result.transition.requiresAuthenticatedBootstrap).toBe(true);
  });
});

