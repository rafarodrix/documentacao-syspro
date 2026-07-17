import { describe, expect, it } from "vitest";

import { buildScopedPendingItems } from "../src/modules/remote-admin/support/remote-host.queries";

describe("buildScopedPendingItems", () => {
  const companyOptions = [
    {
      id: "company-trilink",
      label: "Cliente Trilink | Cliente Trilink LTDA",
      searchText: "Cliente Trilink Cliente Trilink LTDA",
    },
    {
      id: "company-outra",
      label: "Outra Empresa | Outra Empresa LTDA",
      searchText: "Outra Empresa Outra Empresa LTDA",
    },
  ];

  const baseHost = {
    machineName: "SERVIDOR",
    agentExternalId: "123456789",
    agentVersion: "1.0.65",
    provider: "RustDesk",
    environment: "production",
    description: null,
    serviceStatus: "running",
    status: "PENDING_LINK" as const,
    linkedHostId: null,
    firstSeenAt: new Date("2026-07-15T10:00:00.000Z"),
    lastHeartbeatAt: new Date("2026-07-15T10:05:00.000Z"),
    updatedAt: new Date("2026-07-15T10:05:00.000Z"),
  };

  it("keeps scoped discoveries that match the company suggestion or remain unclassified", () => {
    const items = buildScopedPendingItems(
      [
        {
          ...baseHost,
          id: "pending-trilink",
          installationsSnapshot: [{ empresa: "Cliente Trilink" }],
        },
        {
          ...baseHost,
          id: "pending-outra",
          installationsSnapshot: [{ empresa: "Outra Empresa" }],
        },
        {
          ...baseHost,
          id: "pending-sem-sugestao",
          installationsSnapshot: [{ empresa: "Empresa sem match" }],
        },
        {
          ...baseHost,
          id: "pending-sem-telemetria",
          installationsSnapshot: [],
        },
      ],
      companyOptions,
      {
        role: "CLIENTE_ADMIN",
        isGlobalView: false,
        companyIds: ["company-trilink"],
        companyCount: 1,
        summary: "Escopo restrito.",
      },
    );

    expect(items.map((item) => item.id)).toEqual([
      "pending-trilink",
      "pending-sem-sugestao",
      "pending-sem-telemetria",
    ]);
    expect(items.find((item) => item.id === "pending-trilink")?.suggestedCompanyId).toBe("company-trilink");
    expect(items.find((item) => item.id === "pending-sem-sugestao")?.suggestedCompanyId).toBeNull();
  });

  it("keeps all pending discovered hosts for global operators", () => {
    const items = buildScopedPendingItems(
      [
        {
          ...baseHost,
          id: "pending-trilink",
          installationsSnapshot: [{ empresa: "Cliente Trilink" }],
        },
        {
          ...baseHost,
          id: "pending-sem-sugestao",
          installationsSnapshot: [{ empresa: "Empresa sem match" }],
        },
      ],
      companyOptions,
      {
        role: "SUPORTE",
        isGlobalView: true,
        companyIds: [],
        companyCount: 0,
        summary: "Visao global.",
      },
    );

    expect(items.map((item) => item.id)).toEqual(["pending-trilink", "pending-sem-sugestao"]);
  });

  it("hides discoveries already classified for another scoped company", () => {
    const items = buildScopedPendingItems(
      [
        {
          ...baseHost,
          id: "pending-outra",
          installationsSnapshot: [{ empresa: "Outra Empresa" }],
        },
      ],
      companyOptions,
      {
        role: "CLIENTE_ADMIN",
        isGlobalView: false,
        companyIds: ["company-trilink"],
        companyCount: 1,
        summary: "Escopo restrito.",
      },
    );

    expect(items).toHaveLength(0);
  });
});
