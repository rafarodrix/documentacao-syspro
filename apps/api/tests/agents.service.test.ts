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

describe("AgentsService", () => {
  const prisma = {
    agentDevice: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    agentDeviceRevocation: {
      findUnique: vi.fn(),
    },
    remoteHost: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    remoteDiscoveredHost: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
    prisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
    prisma.agentDeviceRevocation.findUnique.mockResolvedValue(null);
    prisma.remoteHost.findFirst.mockResolvedValue(null);
    prisma.remoteHost.findMany.mockResolvedValue([]);
    prisma.remoteHost.findUnique.mockResolvedValue(null);
    prisma.remoteDiscoveredHost.findMany.mockResolvedValue([]);
    authorizationService.resolveCompanyAccessScope.mockResolvedValue({ isGlobal: true, companyIds: [] });
    service = new AgentsService(prisma as any, authorizationService as any);
  });

  it("does not materialize remote discovery records during register without explicit remote ingress", async () => {
    prisma.agentDevice.upsert.mockResolvedValue({
      remoteHostId: null,
      companyId: "company-1",
    });

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
    prisma.agentDevice.upsert.mockResolvedValue({
      hostname: "SERVIDOR-01",
      identitySource: "windows",
      os: "Windows Server",
      remoteHostId: null,
      companyId: "company-1",
    });

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
    prisma.agentDevice.findUnique.mockResolvedValue({
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
    });

    const response = await service.getDesiredState("internal-key", "device-123");

    expect(prisma.agentDevice.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: "device-123" },
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
    prisma.agentDevice.findUnique.mockResolvedValue({
      id: "device-row-1",
      deviceId: "device-123",
      hostname: "SERVIDOR",
      os: "Windows Server",
      identitySource: "windows",
      agentVersion: "go-agent-v1",
      companyId: "company-1",
      remoteHostId: "host-1",
      firstSeenAt: new Date("2026-07-12T18:00:00.000Z"),
      lastHeartbeatAt: new Date(Date.now() - 20 * 60 * 1000),
      lastRegisteredAt: new Date("2026-07-12T18:00:00.000Z"),
      company: {
        id: "company-1",
        nomeFantasia: "Empresa 1",
        razaoSocial: "Empresa 1 LTDA",
      },
      remoteHost: {
        id: "host-1",
        name: "Servidor Principal",
        lastHeartbeatAt: new Date(Date.now() - 2 * 60 * 1000),
        lastHeartbeatSuccessAt: new Date(Date.now() - 2 * 60 * 1000),
      },
    });

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
    prisma.agentDevice.count.mockResolvedValue(1);
    prisma.agentDevice.findMany.mockResolvedValue([]);

    await service.listDevices({}, {
      page: 1,
      pageSize: 50,
      status: "online",
      search: "SERVIDOR",
    });

    const countArgs = prisma.agentDevice.count.mock.calls[0][0];
    expect(countArgs.where.AND).toHaveLength(2);
    expect(countArgs.where.AND[0]).toEqual({
      OR: [
        { deviceId: { contains: "SERVIDOR", mode: "insensitive" } },
        { hostname: { contains: "SERVIDOR", mode: "insensitive" } },
        { os: { contains: "SERVIDOR", mode: "insensitive" } },
      ],
    });
    expect(countArgs.where.AND[1]).toMatchObject({
      OR: [
        { lastHeartbeatAt: { gte: expect.any(Date) } },
        { remoteHost: { is: { lastHeartbeatSuccessAt: { gte: expect.any(Date) } } } },
        { remoteHost: { is: { lastHeartbeatAt: { gte: expect.any(Date) } } } },
      ],
    });
  });

  it("computes fleet stats online count from the effective heartbeat sources", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentDevice.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const response = await service.getFleetStats({});

    expect(response.success).toBe(true);
    expect(response.data.online).toBe(2);
    expect(response.data.offline).toBe(1);
    expect(prisma.agentDevice.count.mock.calls[1][0]).toMatchObject({
      where: {
        OR: [
          { lastHeartbeatAt: { gte: expect.any(Date) } },
          { remoteHost: { is: { lastHeartbeatSuccessAt: { gte: expect.any(Date) } } } },
          { remoteHost: { is: { lastHeartbeatAt: { gte: expect.any(Date) } } } },
        ],
      },
    });
  });

  it("treats unlinked device as online when matching discovery heartbeat is recent", async () => {
    authorizationService.assertPermission.mockResolvedValue({ userId: "user-1" });
    prisma.agentDevice.findUnique.mockResolvedValue({
      id: "device-row-1",
      deviceId: "device-123",
      hostname: "SERVIDOR",
      os: "Windows Server",
      identitySource: "machine-guid",
      agentVersion: "go-agent-v1",
      companyId: null,
      remoteHostId: null,
      firstSeenAt: new Date("2026-07-12T18:00:00.000Z"),
      lastHeartbeatAt: new Date(Date.now() - 20 * 60 * 1000),
      lastRegisteredAt: new Date("2026-07-12T18:00:00.000Z"),
      company: null,
      remoteHost: null,
    });
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
    prisma.agentDevice.update.mockResolvedValue({
      id: "device-row-1",
      deviceId: "device-123",
      hostname: "SERVIDOR",
      os: "Windows Server",
      identitySource: "machine-guid",
      agentVersion: "go-agent-v1",
      companyId: "company-1",
      remoteHostId: "host-1",
      firstSeenAt: new Date("2026-07-12T18:00:00.000Z"),
      lastHeartbeatAt: new Date("2026-07-12T18:05:00.000Z"),
      lastRegisteredAt: new Date("2026-07-12T18:00:00.000Z"),
      company: {
        id: "company-1",
        nomeFantasia: "Empresa 1",
        razaoSocial: "Empresa 1 LTDA",
      },
      remoteHost: {
        id: "host-1",
        name: "Servidor Principal",
        lastHeartbeatAt: new Date("2026-07-12T18:05:00.000Z"),
        lastHeartbeatSuccessAt: new Date("2026-07-12T18:05:00.000Z"),
      },
    });

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
        agentDevice: {
          deviceId: "device-123",
          hostname: "SERVIDOR",
        },
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
