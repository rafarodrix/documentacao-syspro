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

describe("AgentsService desired state", () => {
  const prisma = {
    agentDevice: {
      findUnique: vi.fn(),
    },
  };

  const authorizationService = {
    assertPermission: vi.fn(),
  };

  let service: AgentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentsService(prisma as any, authorizationService as any);
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
});
