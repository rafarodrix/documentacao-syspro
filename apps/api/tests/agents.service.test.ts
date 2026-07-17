import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/common/auth/internal-api-auth", () => ({
  assertInternalApiKey: vi.fn(),
}));

vi.mock("../src/common/system-settings/remote-module-settings-snapshot", () => ({
  getRemoteModuleSettingsSnapshot: vi.fn(async () => ({
    rustDeskServerHost: "relay.trilink.local",
    rustDeskServerConfig: "relay=relay.trilink.local",
    defaultPassword: "secret",
    rustDeskAutoInstall: true,
  })),
}));

vi.mock("@dosc-syspro/config", () => ({
  readChatwootRuntimeConfig: vi.fn(() => ({
    url: "https://chat.example.com",
  })),
}));

import { AgentsService } from "../src/modules/agents/agents.service";

function buildInstallationRow(input?: {
  companyId?: string | null;
  company?: { id: string; nomeFantasia: string | null; razaoSocial: string } | null;
  deviceRecord?: {
    id: string;
    deviceId: string;
    hostname: string | null;
    os: string | null;
    identitySource: string | null;
  };
  lastHeartbeatAt?: Date | null;
  lastRegisteredAt?: Date | null;
  remoteCapability?: {
    id?: string;
    status?: string;
    externalId?: string | null;
    remoteHostId?: string | null;
    companyId?: string | null;
    remoteHost?: {
      id: string;
      name: string;
      lastHeartbeatAt: Date | null;
      lastHeartbeatSuccessAt: Date | null;
    } | null;
  } | null;
}) {
  return {
    id: "inst-row-1",
    agentInstanceId: "install-123",
    credentialId: "cred-123",
    agentVersion: "go-agent-v1",
    companyId: input?.companyId ?? "company-1",
    firstSeenAt: new Date("2026-07-12T18:00:00.000Z"),
    lastHeartbeatAt: input?.lastHeartbeatAt ?? new Date("2026-07-12T18:05:00.000Z"),
    lastRegisteredAt: input?.lastRegisteredAt ?? new Date("2026-07-12T18:00:00.000Z"),
    supersededAt: null,
    deviceRecord: input?.deviceRecord ?? {
      id: "device-row-1",
      deviceId: "device-123",
      hostname: "SERVIDOR",
      os: "Windows Server",
      identitySource: "windows",
    },
    company: input?.company ?? {
      id: "company-1",
      nomeFantasia: "Empresa 1",
      razaoSocial: "Empresa 1 LTDA",
    },
    capabilities: input?.remoteCapability
      ? [
          {
            id: input.remoteCapability.id ?? "cap-row-1",
            kind: "REMOTE",
            status: input.remoteCapability.status ?? "ACTIVE",
            externalId: input.remoteCapability.externalId ?? "123456789",
            remoteHostId: input.remoteCapability.remoteHostId ?? "host-1",
            companyId: input.remoteCapability.companyId ?? input?.companyId ?? "company-1",
            remoteHost:
              input.remoteCapability.remoteHost ?? {
                id: "host-1",
                name: "Servidor Principal",
                lastHeartbeatAt: new Date("2026-07-12T18:05:00.000Z"),
                lastHeartbeatSuccessAt: new Date("2026-07-12T18:05:00.000Z"),
              },
          },
        ]
      : [],
  };
}

describe("AgentsService", () => {
  const prisma = {
    device: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    agentInstallation: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    agentCapability: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    agentDeviceRevocation: {
      findUnique: vi.fn(),
    },
    remoteHost: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    remoteDiscoveredHost: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const authorizationService = {
    assertPermission: vi.fn(),
    resolveCompanyAccessScope: vi.fn(),
  };

  let service: AgentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (input: unknown) => {
      if (typeof input === "function") {
        return input(prisma as any);
      }
      return Promise.all(input as Array<Promise<unknown>>);
    });
    prisma.agentDeviceRevocation.findUnique.mockResolvedValue(null);
    prisma.remoteHost.findFirst.mockResolvedValue(null);
    prisma.remoteHost.findMany.mockResolvedValue([]);
    prisma.remoteHost.findUnique.mockResolvedValue(null);
    prisma.remoteDiscoveredHost.findMany.mockResolvedValue([]);
    prisma.device.upsert.mockResolvedValue({ id: "device-row-1" });
    prisma.agentInstallation.upsert.mockResolvedValue({ id: "inst-row-1" });
    prisma.agentInstallation.updateMany.mockResolvedValue({ count: 0 });
    prisma.agentInstallation.findUnique.mockResolvedValue(buildInstallationRow());
    prisma.agentCapability.upsert.mockResolvedValue({ id: "cap-row-1" });
    authorizationService.resolveCompanyAccessScope.mockResolvedValue({ isGlobal: true, companyIds: [] });
    service = new AgentsService(prisma as any, authorizationService as any);
  });

  it("does not materialize remote discovery records during register without explicit remote ingress", async () => {
    prisma.agentInstallation.findUnique.mockResolvedValue(
      buildInstallationRow({
        remoteCapability: {
          remoteHostId: null,
          remoteHost: null,
        },
      }),
    );

    const response = await service.register("internal-key", {
      deviceId: "device-123",
      agentInstanceId: "install-123",
      credentialId: "cred-123",
      hostname: "SERVIDOR-01",
      os: "Windows Server",
      identitySource: "windows",
      agentVersion: "go-agent-v1",
      remoteLinkContext: {
        rustdeskId: "123456789",
        companyId: "company-1",
      },
    });

    expect(response.success).toBe(true);
    expect(prisma.remoteDiscoveredHost.findFirst).not.toHaveBeenCalled();
    expect(prisma.remoteDiscoveredHost.create).not.toHaveBeenCalled();
    expect(prisma.remoteDiscoveredHost.update).not.toHaveBeenCalled();
  });

  it("does not materialize remote discovery records during heartbeat without explicit remote ingress", async () => {
    prisma.agentInstallation.findUnique.mockResolvedValue(
      buildInstallationRow({
        remoteCapability: {
          remoteHostId: null,
          remoteHost: null,
        },
      }),
    );

    const response = await service.heartbeat("internal-key", {
      deviceId: "device-123",
      agentInstanceId: "install-123",
      credentialId: "cred-123",
      agentVersion: "go-agent-v1",
      at: "2026-07-14T20:00:00.000Z",
      remoteLinkContext: {
        rustdeskId: "123456789",
        companyId: "company-1",
      },
    });

    expect(response.success).toBe(true);
    expect(prisma.remoteDiscoveredHost.findFirst).not.toHaveBeenCalled();
    expect(prisma.remoteDiscoveredHost.create).not.toHaveBeenCalled();
    expect(prisma.remoteDiscoveredHost.update).not.toHaveBeenCalled();
  });

  it("returns all linked Syspro installations for a host with multiple companies", async () => {
    prisma.agentInstallation.findFirst.mockResolvedValue({
      deviceRecord: {
        id: "device-row-1",
        deviceId: "device-123",
      },
      capabilities: [
        {
          remoteHost: {
            id: "host-1",
            sysproUpdates: [
              {
                companyId: "company-a",
                companyLabel: "Empresa A",
                path: "C:\\Syspro\\EmpresaA",
                company: {
                  nomeFantasia: "Empresa A",
                  razaoSocial: "Empresa A LTDA",
                },
              },
              {
                companyId: "company-b",
                companyLabel: "Empresa B",
                path: "D:\\Syspro\\EmpresaB",
                company: {
                  nomeFantasia: null,
                  razaoSocial: "Empresa B SA",
                },
              },
            ],
          },
        },
      ],
    });

    const response = await service.getDesiredState("internal-key", "device-123");

    expect(prisma.agentInstallation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deviceRecord: { deviceId: "device-123" },
        }),
      }),
    );
    expect(response.success).toBe(true);
    expect(response.data.device.collect_inventory).toBe(true);
    expect(response.data.device.collect_metrics).toBe(true);
    expect(response.data.device.syspro_installs).toEqual([
      {
        company_id: "company-a",
        company_name: "Empresa A",
        server_path: "C:\\Syspro\\EmpresaA",
      },
      {
        company_id: "company-b",
        company_name: "Empresa B SA",
        server_path: "D:\\Syspro\\EmpresaB",
      },
    ]);
  });

  it("treats linked device as online when remote host sync is recent", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentInstallation.findFirst.mockResolvedValue(
      buildInstallationRow({
        lastHeartbeatAt: new Date(Date.now() - 20 * 60 * 1000),
        remoteCapability: {
          remoteHostId: "host-1",
          remoteHost: {
            id: "host-1",
            name: "Servidor Principal",
            lastHeartbeatAt: new Date(Date.now() - 2 * 60 * 1000),
            lastHeartbeatSuccessAt: new Date(Date.now() - 2 * 60 * 1000),
          },
        },
      }),
    );

    const response = await service.getDevice({}, "device-123");

    expect(response.success).toBe(true);
    expect(response.data.isOnline).toBe(true);
    expect(response.data.remoteHostName).toBe("Servidor Principal");
    expect(response.data.lastHeartbeatAt).not.toBeNull();
    expect(response.data.heartbeatLagSeconds).not.toBeNull();
    expect((response.data.heartbeatLagSeconds ?? 9999) < 5 * 60).toBe(true);
  });

  it("builds online device filters from the effective heartbeat sources", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentInstallation.count.mockResolvedValue(1);
    prisma.agentInstallation.findMany.mockResolvedValue([]);

    await service.listDevices({}, {
      page: 1,
      pageSize: 50,
      status: "online",
      search: "SERVIDOR",
    });

    const countArgs = prisma.agentInstallation.count.mock.calls[0][0];
    expect(countArgs.where.AND).toHaveLength(3);
    expect(countArgs.where.AND[0]).toEqual({ supersededAt: null });
    expect(countArgs.where.AND[1]).toEqual({
      OR: [
        { deviceRecord: { deviceId: { contains: "SERVIDOR", mode: "insensitive" } } },
        { deviceRecord: { hostname: { contains: "SERVIDOR", mode: "insensitive" } } },
        { deviceRecord: { os: { contains: "SERVIDOR", mode: "insensitive" } } },
      ],
    });
    expect(countArgs.where.AND[2]).toMatchObject({
      OR: [
        { lastHeartbeatAt: { gte: expect.any(Date) } },
        { capabilities: { some: { kind: "REMOTE", remoteHost: { is: { lastHeartbeatSuccessAt: { gte: expect.any(Date) } } } } } },
        { capabilities: { some: { kind: "REMOTE", remoteHost: { is: { lastHeartbeatAt: { gte: expect.any(Date) } } } } } },
      ],
    });
  });

  it("computes fleet stats online count from the effective heartbeat sources", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentInstallation.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const response = await service.getFleetStats({});

    expect(response.success).toBe(true);
    expect(response.data.online).toBe(2);
    expect(response.data.offline).toBe(1);
    expect(prisma.agentInstallation.count.mock.calls[1][0]).toMatchObject({
      where: {
        AND: [
          { supersededAt: null },
          {
            OR: [
              { lastHeartbeatAt: { gte: expect.any(Date) } },
              { capabilities: { some: { kind: "REMOTE", remoteHost: { is: { lastHeartbeatSuccessAt: { gte: expect.any(Date) } } } } } },
              { capabilities: { some: { kind: "REMOTE", remoteHost: { is: { lastHeartbeatAt: { gte: expect.any(Date) } } } } } },
            ],
          },
        ],
      },
    });
  });

  it("treats unlinked device as online when matching discovery heartbeat is recent", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentInstallation.findFirst.mockResolvedValue(
      buildInstallationRow({
        companyId: null,
        company: null,
        lastHeartbeatAt: new Date(Date.now() - 20 * 60 * 1000),
        remoteCapability: null,
      }),
    );
    prisma.remoteDiscoveredHost.findMany.mockResolvedValue([
      {
        machineName: "SERVIDOR",
        lastHeartbeatAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    ]);

    const response = await service.getDevice({}, "device-123");

    expect(response.success).toBe(true);
    expect(response.data.isOnline).toBe(true);
    expect((response.data.heartbeatLagSeconds ?? 9999) < 5 * 60).toBe(true);
  });

  it("requires agents manage permission to link a device manually", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1", role: "ADMIN", email: "ops@example.com" });
    authorizationService.resolveCompanyAccessScope.mockResolvedValue({ isGlobal: true, companyIds: [] });
    prisma.remoteHost.findUnique.mockResolvedValue({ id: "host-1", companyId: "company-1" });
    prisma.agentInstallation.findFirst.mockResolvedValue({ id: "inst-row-1" });
    prisma.agentInstallation.findUnique.mockResolvedValue(buildInstallationRow());

    await service.linkDevice({}, "device-123", { remoteHostId: "host-1" });

    expect(authorizationService.assertPermission).toHaveBeenCalledWith({}, "agents:manage");
  });

  it("lists host options only inside the agent manage scope", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1", role: "CLIENTE_ADMIN", email: "cliente@example.com" });
    authorizationService.resolveCompanyAccessScope.mockResolvedValue({ isGlobal: false, companyIds: ["company-1"] });
    prisma.remoteHost.findMany.mockResolvedValue([
      {
        id: "host-1",
        name: "Servidor Principal",
        companyId: "company-1",
        status: "ACTIVE",
        company: {
          nomeFantasia: "Empresa 1",
          razaoSocial: "Empresa 1 LTDA",
        },
        agentCapabilities: [
          {
            installation: {
              deviceRecord: {
                deviceId: "device-123",
                hostname: "SERVIDOR",
              },
            },
          },
        ],
      },
    ]);

    const response = await service.listHostOptions({}, { search: "Servidor" });

    expect(authorizationService.assertPermission).toHaveBeenCalledWith({}, "agents:manage");
    expect(authorizationService.resolveCompanyAccessScope).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
      "agents:manage",
    );
    expect(prisma.remoteHost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: { in: ["company-1"] },
        }),
      }),
    );
    expect(response.data).toEqual([
      {
        id: "host-1",
        name: "Servidor Principal",
        companyId: "company-1",
        companyName: "Empresa 1",
        status: "ACTIVE",
        linkedDeviceId: "device-123",
        linkedDeviceHostname: "SERVIDOR",
      },
    ]);
  });
});
