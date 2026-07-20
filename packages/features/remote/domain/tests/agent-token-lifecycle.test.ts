import { describe, expect, it, vi } from "vitest";
import { processAck } from "../src/use-cases/process-ack.use-case";
import { processBootstrap } from "../src/use-cases/process-bootstrap.use-case";
import { processDiscover } from "../src/use-cases/process-discover.use-case";
import { processSync } from "../src/use-cases/process-sync.use-case";
import type { RemoteAckPort, RemoteBootstrapPort, RemoteDiscoverPort, RemoteSyncPort } from "../src/remote-domain.port";

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
    normalizeSystemMetrics: vi.fn(() => null),
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
        state: "LINKED_BOOTSTRAP_REQUIRED",
        nextStep: "bootstrap",
        nextEndpoint: "/api/remote/rustdesk/bootstrap",
        allowDiscoveryHeartbeat: false,
        requiresAuthenticatedBootstrap: true,
      },
      token_invalid: {
        state: "TOKEN_INVALID",
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
      status: "LINKED",
    })),
    findLinkedHost: vi.fn(async () => ({
      id: "host-1",
      name: "ERP-MATRIZ-01",
      installToken: "rhost_token",
      agentTokenHash: "token-hash",
      lastHeartbeatErrorMessage: null,
    })),
    tryAutoLinkDiscoveredHost: vi.fn(async () => null),
    issueBootstrapInstallToken: vi.fn(async () => "rhost_token"),
    updateDiscoveredHost: vi.fn(async () => ({ id: "disc-1" })),
    createDiscoveredHost: vi.fn(async () => ({ id: "disc-2" })),
    logInfo: vi.fn(async () => {}),
    logWarning: vi.fn(async () => {}),
    logError: vi.fn(async () => {}),
    ...overrides,
  };

  return port;
}

function buildAckPort(overrides: Partial<RemoteAckPort> = {}): RemoteAckPort {
  const port: RemoteAckPort = {
    resolveHostByAgentToken: vi.fn(async () => ({
      hostId: "host-1",
      agentTokenIssuedAt: new Date("2026-03-28T10:00:00.000Z"),
    })),
    isAgentTokenExpired: vi.fn(() => false),
    findDeliverableCommand: vi.fn(async () => ({ id: "cmd-1", type: "UPGRADE_CLIENT" })),
    persistAck: vi.fn(async () => {}),
    logInfo: vi.fn(async () => {}),
    ...overrides,
  };

  return port;
}

function buildBootstrapPort(overrides: Partial<RemoteBootstrapPort> = {}): RemoteBootstrapPort {
  const port: RemoteBootstrapPort = {
    getExpectedDiscoveryToken: vi.fn(() => "DISCOVERY_TOKEN"),
    resolveHostByInstallToken: vi.fn(async () => ({
      hostId: "host-1",
      hostName: "ERP-MATRIZ-01",
      companyId: "company-1",
      companyName: "Empresa X",
      agentExternalId: null,
      machineName: "ERP-MATRIZ-01",
      agentVersion: "1.4.6",
      environment: "production",
      lastKnownIp: "127.0.0.1",
      discoveryStatus: "LINKED",
      discoveryAgentExternalId: "21187620068",
      discoveryMachineName: "ERP-MATRIZ-01",
      discoveryLastHeartbeatAt: new Date("2026-03-28T10:00:00.000Z"),
      bootstrapAuthorizedUntil: new Date("2026-03-28T10:30:00.000Z"),
    })),
    resolvePendingBootstrapByDiscovery: vi.fn(async () => ({
      discoveredHostId: "disc-1",
      discoveryStatus: "PENDING_LINK",
      discoveryAgentExternalId: "21187620068",
      discoveryMachineName: "ERP-MATRIZ-01",
      discoveryLastHeartbeatAt: new Date("2026-03-28T10:00:00.000Z"),
    })),
    getConfigProfile: vi.fn(async () => ({
      serverHost: "acesso.trilinksoftware.com.br",
      apiHost: "acesso.trilinksoftware.com.br",
      publicKey: "pub-key",
      publicKeyHash: "pub-hash",
      serverConfig: "cfg",
      targetVersion: "1.4.6",
      defaultPassword: "senha",
      autoInstall: true,
      autoUpgrade: true,
      installerUrl: "https://downloads.example.com/rustdesk.exe",
      installerChecksumSha256: "sha256",
      installerPackageType: "exe",
      installerSilentArgs: "/S",
      restartServiceAfterApply: true,
      suppressTrayShortcuts: true,
      hideTray: true,
      hideStopService: true,
      allowRemoteConfigModification: false,
      allowD3DRender: true,
      enableDirectXCapture: true,
    })),
    issueAgentToken: vi.fn(async () => ({
      token: "agt_valid",
      tokenHash: "hash_valid",
      issuedAt: new Date("2026-03-28T10:05:00.000Z"),
    })),
    hashPublicKey: vi.fn(() => "pub-hash"),
    normalizeRustdeskId: vi.fn((value: string | null | undefined) => value ?? null),
    resolveAlias: vi.fn(() => "EMPRESA X | ERP-MATRIZ-01"),
    getAgentTokenExpiresAt: vi.fn((issuedAt: Date | null) => (issuedAt ? new Date(issuedAt.getTime() + 86400000) : null)),
    saveProcessedBootstrap: vi.fn(async ({ host, rustdeskId, machineName, input, configProfile, issuedToken, reportedPublicKeyHash, alias }) => ({
      id: host.hostId,
      companyId: host.companyId,
      agentExternalId: rustdeskId,
      machineName,
      agentVersion: input.agentVersion || host.agentVersion,
      environment: input.environment || host.environment,
      agentTokenIssuedAt: issuedToken.issuedAt,
      lastKnownRustDeskAlias: alias,
      lastKnownRustDeskVersion: configProfile.targetVersion,
      lastKnownRustDeskServerHost: configProfile.serverHost,
      lastKnownRustDeskApiHost: configProfile.apiHost,
      lastKnownRustDeskPublicKeyHash: reportedPublicKeyHash,
      lastRustDeskConfigSyncAt: new Date("2026-03-28T10:05:00.000Z"),
    })),
    logInfo: vi.fn(async () => {}),
    logWarning: vi.fn(async () => {}),
    ...overrides,
  };

  return port;
}

describe("agent token lifecycle", () => {
  it("accepts bootstrap when discover authorization is recent and identity matches", async () => {
    const port = buildBootstrapPort();

    const result = await processBootstrap(
      {
        installToken: "rhost_token",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
      },
      {
        port,
        now: () => new Date("2026-03-28T10:10:00.000Z"),
      },
    );

    expect(result.hostId).toBe("host-1");
    expect(result.agentToken).toBe("agt_valid");
    expect(port.saveProcessedBootstrap).toHaveBeenCalledOnce();
  });

  it("rejects bootstrap when discover authorization is stale or missing", async () => {
    const port = buildBootstrapPort({
      resolveHostByInstallToken: vi.fn(async () => ({
        hostId: "host-1",
        hostName: "ERP-MATRIZ-01",
        companyId: "company-1",
        companyName: "Empresa X",
        agentExternalId: null,
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
        environment: "production",
        lastKnownIp: "127.0.0.1",
        discoveryStatus: "LINKED",
        discoveryAgentExternalId: "21187620068",
        discoveryMachineName: "ERP-MATRIZ-01",
        discoveryLastHeartbeatAt: new Date("2026-03-28T08:00:00.000Z"),
        bootstrapAuthorizedUntil: new Date("2026-03-28T08:30:00.000Z"),
      })),
    });

    await expect(
      processBootstrap(
        {
          installToken: "rhost_token",
          rustdeskId: "21187620068",
          machineName: "ERP-MATRIZ-01",
        },
        {
          port,
          now: () => new Date("2026-03-28T10:10:00.000Z"),
        },
      ),
    ).rejects.toThrow("INSTALL_TOKEN_DISCOVERY_REQUIRED");

    expect(port.logWarning).toHaveBeenCalledWith(
      "remote.domain.bootstrap.authorization_blocked",
      expect.objectContaining({
        hostId: "host-1",
        reason: "INSTALL_TOKEN_DISCOVERY_REQUIRED",
      }),
    );
  });

  it("rejects bootstrap when machine identity diverges from the authorized discover", async () => {
    const port = buildBootstrapPort();

    await expect(
      processBootstrap(
        {
          installToken: "rhost_token",
          rustdeskId: "99999999999",
          machineName: "ERP-MATRIZ-01",
        },
        {
          port,
          now: () => new Date("2026-03-28T10:10:00.000Z"),
        },
      ),
    ).rejects.toThrow("INSTALL_TOKEN_IDENTITY_MISMATCH");

    expect(port.logWarning).toHaveBeenCalledWith(
      "remote.domain.bootstrap.authorization_blocked",
      expect.objectContaining({
        hostId: "host-1",
        reason: "INSTALL_TOKEN_IDENTITY_MISMATCH",
      }),
    );
  });

  it("accepts technical bootstrap while discovery is pending link", async () => {
    const port = buildBootstrapPort();

    const result = await processBootstrap(
      {
        discoveryToken: "DISCOVERY_TOKEN",
        discoveredHostId: "disc-1",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
      },
      {
        port,
        now: () => new Date("2026-03-28T10:10:00.000Z"),
      },
    );

    expect(result.bootstrapMode).toBe("discovery");
    expect(result.agentToken).toBeNull();
    expect(result.hostId).toBeNull();
    expect(result.flow.stage).toBe("AWAITING_LINK");
    expect(port.saveProcessedBootstrap).not.toHaveBeenCalled();
  });

  it("accepts sync when token is valid", async () => {
    const port = buildSyncPort();

    const result = await processSync(
      {
        schemaVersion: "sync.payload.v1",
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

  it("logs an explicit warning when extended inventory snapshots are missing", async () => {
    const port = buildSyncPort();

    await processSync(
      {
        schemaVersion: "sync.payload.v1",
        agentToken: "valid-token",
        machineName: "ERP-MATRIZ-01",
        agentVersion: "1.4.6",
      },
      { port },
    );

    expect(port.logWarning).toHaveBeenCalledWith(
      "remote.domain.sync.extended_inventory_missing",
      expect.objectContaining({
        hostId: "host-1",
        missing: expect.arrayContaining([
          "hardwareIdentity",
          "diskSnapshot",
          "sysproProcesses",
          "windowsUpdateStatus",
        ]),
      }),
    );
  });

  it("replays delivered command queue in sync output (recovery visibility)", async () => {
    const port = buildSyncPort({
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
        pendingCommands: [
          {
            id: "cmd-1",
            type: "UPGRADE_CLIENT",
            status: "DELIVERED",
            reason: "upgrade needed",
            payload: { targetVersion: "1.5.0" },
            attemptCount: 2,
            createdAt: new Date("2026-03-28T10:00:00.000Z"),
            deliveredAt: new Date("2026-03-28T10:01:00.000Z"),
          },
          {
            id: "cmd-2",
            type: "REAPPLY_CONFIG",
            status: "DELIVERED",
            reason: "drift",
            payload: { expectedServerHost: "acesso.trilinksoftware.com.br" },
            attemptCount: 1,
            createdAt: new Date("2026-03-28T10:02:00.000Z"),
            deliveredAt: new Date("2026-03-28T10:03:00.000Z"),
          },
        ],
      })),
    });

    const result = await processSync(
      {
        schemaVersion: "sync.payload.v1",
        agentToken: "valid-token",
      },
      { port },
    );

    expect(result.commandQueue).toHaveLength(2);
    expect(result.actions).toEqual(["upgrade_client", "reapply_config"]);
  });

  it("emits payload warnings when extended sync blocks are invalid", async () => {
    const port = buildSyncPort();

    const result = await processSync(
      {
        schemaVersion: "sync.payload.v1",
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

    await expect(processSync({ schemaVersion: "sync.payload.v1", agentToken: "invalid-token" }, { port })).rejects.toThrow(
      "AGENT_TOKEN_INVALID",
    );
  });

  it("rejects sync when token is expired", async () => {
    const port = buildSyncPort({
      isAgentTokenExpired: vi.fn(() => true),
    });

    await expect(processSync({ schemaVersion: "sync.payload.v1", agentToken: "expired-token" }, { port })).rejects.toThrow(
      "AGENT_TOKEN_EXPIRED",
    );
  });

  it("returns bootstrapFlow token_invalid when linked host token is invalid", async () => {
    const issueBootstrapInstallToken = vi.fn(async () => "rhost_rotated");
    const port = buildDiscoverPort({
      findLinkedHost: vi.fn(async () => ({
        id: "host-1",
        name: "ERP-MATRIZ-01",
        installToken: "rhost_token",
        agentTokenHash: "token-hash",
        lastHeartbeatErrorMessage: "agentToken rotacionado durante sync",
      })),
      issueBootstrapInstallToken,
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("linked");
    expect(result.bootstrapFlow).toBe("token_invalid");
    expect(result.installToken).toBe("rhost_rotated");
    expect(result.transition.requiresAuthenticatedBootstrap).toBe(true);
    expect(issueBootstrapInstallToken).toHaveBeenCalledWith("host-1");
  });

  it("returns bootstrapFlow host_bootstrap_required when linked host has no token hash", async () => {
    const issueBootstrapInstallToken = vi.fn(async () => "rhost_rotated");
    const port = buildDiscoverPort({
      findLinkedHost: vi.fn(async () => ({
        id: "host-1",
        name: "ERP-MATRIZ-01",
        installToken: "rhost_token",
        agentTokenHash: null,
        lastHeartbeatErrorMessage: null,
      })),
      issueBootstrapInstallToken,
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("linked");
    expect(result.bootstrapFlow).toBe("host_bootstrap_required");
    expect(result.installToken).toBe("rhost_rotated");
    expect(result.transition.requiresAuthenticatedBootstrap).toBe(true);
    expect(issueBootstrapInstallToken).toHaveBeenCalledWith("host-1");
  });

  it("does not rematerialize ignored hosts after portal removal", async () => {
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => ({
        id: "disc-ignored",
        linkedHostId: null,
        linkedAt: null,
        status: "IGNORED",
      })),
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("pending");
    expect(result.discoveredHostId).toBe("disc-ignored");
    expect(result.bootstrapFlow).toBe("pending_link");
    expect(port.updateDiscoveredHost).not.toHaveBeenCalled();
    expect(port.createDiscoveredHost).not.toHaveBeenCalled();
  });

  it("keeps discover in pending mode when a legacy host exists without explicit discovery linkage", async () => {
    const findLinkedHost = vi.fn(async () => ({
      id: "host-legacy",
      name: "ERP-MATRIZ-01",
      installToken: "rhost_legacy",
      agentTokenHash: "token-hash",
      lastHeartbeatErrorMessage: null,
    }));
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => null),
      findLinkedHost,
      createDiscoveredHost: vi.fn(async () => ({ id: "disc-pending" })),
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("pending");
    expect(result.discoveredHostId).toBe("disc-pending");
    expect(result.bootstrapFlow).toBe("pending_link");
    expect(findLinkedHost).not.toHaveBeenCalled();
    expect(port.createDiscoveredHost).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedHostId: null,
        status: "PENDING_LINK",
      }),
    );
  });

  it("does not expose installToken when linked host is healthy and bootstrap is not required", async () => {
    const issueBootstrapInstallToken = vi.fn(async () => "rhost_rotated");
    const port = buildDiscoverPort({
      issueBootstrapInstallToken,
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(result.mode).toBe("linked");
    expect(result.bootstrapFlow).toBe("linked_host_detected");
    expect(result.installToken).toBeUndefined();
    expect(issueBootstrapInstallToken).not.toHaveBeenCalled();
  });

  it("auto-links discover when there is a single safe company match", async () => {
    const tryAutoLinkDiscoveredHost = vi.fn(async () => ({
      discoveredHostId: "disc-auto",
      hostId: "host-auto",
      hostName: "ERP-MATRIZ-01",
      installToken: "rhost_auto",
      agentTokenHash: null,
      lastHeartbeatErrorMessage: null,
    }));
    const issueBootstrapInstallToken = vi.fn(async () => "rhost_auto_rotated");
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => null),
      tryAutoLinkDiscoveredHost,
      issueBootstrapInstallToken,
      createDiscoveredHost: vi.fn(async () => ({ id: "disc-pending" })),
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
        sysproUpdates: [{ empresa: "Cliente Trilink", caminho: "C:\\Syspro\\Server\\SysproServer.exe" }],
      },
      { port },
    );

    expect(result.mode).toBe("linked");
    expect(result.hostId).toBe("host-auto");
    expect(result.discoveredHostId).toBe("disc-auto");
    expect(result.bootstrapFlow).toBe("host_bootstrap_required");
    expect(result.installToken).toBe("rhost_auto_rotated");
    expect(tryAutoLinkDiscoveredHost).toHaveBeenCalledWith(
      expect.objectContaining({
        discoveredHostId: null,
        machineName: "ERP-MATRIZ-01",
      }),
    );
    expect(port.createDiscoveredHost).not.toHaveBeenCalled();
  });

  it("keeps discover pending when auto-link does not find a single safe match", async () => {
    const tryAutoLinkDiscoveredHost = vi.fn(async () => null);
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => null),
      tryAutoLinkDiscoveredHost,
      createDiscoveredHost: vi.fn(async () => ({ id: "disc-pending" })),
    });

    const result = await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
        sysproUpdates: [{ empresa: "Empresa Ambigua", caminho: "C:\\Syspro\\Server\\SysproServer.exe" }],
      },
      { port },
    );

    expect(result.mode).toBe("pending");
    expect(result.discoveredHostId).toBe("disc-pending");
    expect(tryAutoLinkDiscoveredHost).toHaveBeenCalled();
    expect(port.createDiscoveredHost).toHaveBeenCalled();
  });


  it("rejects ACK FAILED with invalid reasonCode", async () => {
    const port = buildAckPort();

    await expect(
      processAck(
        {
          schemaVersion: "ack.payload.v1",
          agentToken: "valid-token",
          commandId: "cmd-1",
          status: "FAILED",
          reasonCode: "INVALID_REASON",
        },
        { port },
      ),
    ).rejects.toThrow();
  });

  it("rejects ACK FAILED without reasonCode", async () => {
    const port = buildAckPort();

    await expect(
      processAck(
        {
          schemaVersion: "ack.payload.v1",
          agentToken: "valid-token",
          commandId: "cmd-1",
          status: "FAILED",
        },
        { port },
      ),
    ).rejects.toThrow("ACK_REASON_CODE_REQUIRED");
  });

  it("logs reasonCode and message when ACK FAILED is persisted", async () => {
    const port = buildAckPort();

    await processAck(
      {
        schemaVersion: "ack.payload.v1",
        agentToken: "valid-token",
        commandId: "cmd-1",
        status: "FAILED",
        reasonCode: "COMMAND_EXECUTION_FAILED",
        message: "upgrade client failed: exit status 1603",
        details: {
          installerLog: "C:/ProgramData/Trilink Agent/logs/rustdesk-msi-install.log",
        },
      },
      { port },
    );

    expect(port.logInfo).toHaveBeenCalledWith(
      "remote.domain.ack.succeeded",
      expect.objectContaining({
        commandId: "cmd-1",
        commandType: "UPGRADE_CLIENT",
        status: "FAILED",
        reasonCode: "COMMAND_EXECUTION_FAILED",
        message: "upgrade client failed: exit status 1603",
        hasDetails: true,
      }),
    );
  });

  it("clears linkedHostId when falling back to pending_link (dangling reference resolution)", async () => {
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => ({
        id: "disc-1",
        linkedHostId: "host-deleted",
        linkedAt: null,
        status: "LINKED",
      })),
      findLinkedHost: vi.fn(async () => null),
      updateDiscoveredHost: vi.fn(async () => ({ id: "disc-1" })),
    });

    await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(port.updateDiscoveredHost).toHaveBeenCalledWith(
      "disc-1",
      expect.objectContaining({
        status: "PENDING_LINK",
        linkedHostId: null,
      }),
    );
  });

  it("persists linkedHostId when discovery is linked", async () => {
    const port = buildDiscoverPort({
      findDiscoveredHost: vi.fn(async () => ({
        id: "disc-1",
        linkedHostId: "host-1",
        linkedAt: new Date(),
        status: "LINKED",
      })),
      findLinkedHost: vi.fn(async () => ({
        id: "host-1",
        name: "ERP-MATRIZ-01",
        installToken: "rhost_token",
        agentTokenHash: "token-hash",
        lastHeartbeatErrorMessage: null,
      })),
      updateDiscoveredHost: vi.fn(async () => ({ id: "disc-1" })),
    });

    await processDiscover(
      {
        schemaVersion: "discover.payload.v1",
        discoveryToken: "DISCOVERY_TOKEN",
        rustdeskId: "21187620068",
        machineName: "ERP-MATRIZ-01",
      },
      { port },
    );

    expect(port.updateDiscoveredHost).toHaveBeenCalledWith(
      "disc-1",
      expect.objectContaining({
        status: "LINKED",
        linkedHostId: "host-1",
      }),
    );
  });
});
