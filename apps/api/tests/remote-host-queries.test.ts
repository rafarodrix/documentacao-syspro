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

  it("returns only discovered hosts that match the scoped company suggestion", () => {
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

    expect(items.map((item) => item.id)).toEqual(["pending-trilink"]);
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
});
