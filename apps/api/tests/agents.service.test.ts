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
        remoteHostSysproUpdates: [
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
});
