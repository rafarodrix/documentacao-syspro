import { describe, expect, it } from "vitest";

import {
  buildScopedPendingItems,
  resolveConfiguredHostBootstrapFlow,
  resolveRemoteProductStatus,
} from "../src/modules/remote-admin/support/remote-host.queries";

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

describe("resolveConfiguredHostBootstrapFlow", () => {
  it("treats configured hosts with pending discovery link as awaiting link", () => {
    expect(
      resolveConfiguredHostBootstrapFlow({
        agentExternalId: "123456789",
        agentTokenHash: null,
        discoveryRecord: { status: "PENDING_LINK" },
      }),
    ).toBe("pending_link");
  });

  it("keeps bootstrap required when there is no pending discovery and the host has no token", () => {
    expect(
      resolveConfiguredHostBootstrapFlow({
        agentExternalId: "123456789",
        agentTokenHash: null,
        discoveryRecord: { status: "LINKED" },
      }),
    ).toBe("host_bootstrap_required");
  });
});

describe("resolveRemoteProductStatus", () => {
  it("treats online linked hosts as ready even when bootstrap flow still says linked_host_detected", () => {
    expect(
      resolveRemoteProductStatus({
        bootstrapFlow: "linked_host_detected",
        lifecycleStatus: "ONLINE",
        operationalStatus: "ONLINE",
        contractErrorCode: null,
      }),
    ).toBe("REMOTE_READY");
  });
});

describe("normalization and search rules", () => {
  it("normalizes CNPJ stripping non-digits", () => {
    const raw = "12.345.678/0001-90";
    const formatted = "12345678000190";
    const partial1 = "123.456";
    const partial2 = "6780001";

    expect(raw.replace(/\D/g, "")).toBe("12345678000190");
    expect(formatted.replace(/\D/g, "")).toBe("12345678000190");
    expect(partial1.replace(/\D/g, "")).toBe("123456");
    expect(partial2.replace(/\D/g, "")).toBe("6780001");
  });

  it("normalizes RustDesk ID stripping spaces and hyphens", () => {
    const id1 = "1218084808";
    const id2 = "1 218 084 808";
    const id3 = "121-808-480-8";

    expect(id1.replace(/\D/g, "")).toBe("1218084808");
    expect(id2.replace(/\D/g, "")).toBe("1218084808");
    expect(id3.replace(/\D/g, "")).toBe("1218084808");
  });

  it("ignores accents, case, and extra spaces in text searches", () => {
    const normalize = (str: string) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    expect(normalize("Sacolão Bela Vista")).toBe("sacolao bela vista");
    expect(normalize("SACOLAO BELA VISTA")).toBe("sacolao bela vista");
    expect(normalize("sacolao   bela   vista")).toBe("sacolao bela vista");
  });
});
