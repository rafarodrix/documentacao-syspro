import { describe, expect, it } from "vitest";

import { matchesPendingCompanyFilter } from "@/features/remote/interface/directory-page.helpers";

describe("matchesPendingCompanyFilter", () => {
  const baseItem = {
    id: "pending-1",
    machineName: "SERVIDOR",
    machineProfile: null,
    rustdeskId: "123456789",
    agentVersion: "1.0.65",
    provider: "RustDesk",
    environment: "production",
    description: null,
    serviceStatus: "running",
    lastHeartbeatAt: "2026-07-15T15:21:50.000Z",
    status: "PENDING_LINK" as const,
    linkedHostId: null,
    suggestedCompanyId: null,
    installationCompanies: [] as string[],
    lastAgentMetrics: null,
    lastAgentMetricsAt: null,
  };

  it("keeps unclassified pending discoveries visible even with a company filter", () => {
    expect(matchesPendingCompanyFilter(baseItem, "company-trilink")).toBe(true);
  });

  it("matches pending discoveries whose detected company aligns with the selected filter", () => {
    expect(
      matchesPendingCompanyFilter(
        {
          ...baseItem,
          suggestedCompanyId: "company-trilink",
          installationCompanies: ["Cliente Trilink"],
        },
        "company-trilink",
      ),
    ).toBe(true);
  });

  it("hides pending discoveries already classified for another company", () => {
    expect(
      matchesPendingCompanyFilter(
        {
          ...baseItem,
          suggestedCompanyId: "company-outra",
          installationCompanies: ["Outra Empresa"],
        },
        "company-trilink",
      ),
    ).toBe(false);
  });

  it("keeps discoveries visible when telemetry names a company but no scoped suggestion was resolved", () => {
    expect(
      matchesPendingCompanyFilter(
        {
          ...baseItem,
          installationCompanies: ["Empresa sem match"],
        },
        "company-trilink",
      ),
    ).toBe(true);
  });
});
