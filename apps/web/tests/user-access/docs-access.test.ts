import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/company/application/company-segment-access", () => ({
  canAccessByCompanySegment: vi.fn(async () => true),
}));

import {
  canUserAccessDocUrl,
  getRequiredSegmentsForDocSlug,
  isAdminOnlyDocUrl,
  isTechnicalManualSlug,
} from "@/lib/docs-access";

describe("docs access without role fallback", () => {
  it("detects technical manuals by slug", () => {
    expect(isTechnicalManualSlug(["manuais-tecnicos", "arquitetura"])).toBe(true);
    expect(isTechnicalManualSlug(["manual", "cadastro"])).toBe(false);
  });

  it("detects admin-only docs by url", () => {
    expect(isAdminOnlyDocUrl("/portal/docs/suporte/documentacao-docs-interna")).toBe(true);
    expect(isAdminOnlyDocUrl("/portal/docs/manual/cadastro")).toBe(false);
  });

  it("keeps segment rules independent from user role", async () => {
    expect(getRequiredSegmentsForDocSlug(["treinamento", "steps-auto-center"])).not.toHaveLength(0);

    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/manuais-tecnicos/arquitetura",
        userId: "user-1",
        canViewTechnical: false,
        canBypassSegmentAccess: false,
      }),
    ).resolves.toBe(false);

    await expect(
      canUserAccessDocUrl({
        url: "/portal/docs/treinamento/steps-auto-center",
        userId: "user-1",
        canViewTechnical: true,
        canBypassSegmentAccess: true,
      }),
    ).resolves.toBe(true);
  });
});
