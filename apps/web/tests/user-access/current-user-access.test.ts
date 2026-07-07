import { beforeEach, describe, expect, it, vi } from "vitest";

const getProtectedSessionMock = vi.fn();
const fetchSettingsAuthorizationContextGatewayMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/features/settings/infrastructure/gateways/settings.gateway", () => ({
  fetchSettingsAuthorizationContextGateway: fetchSettingsAuthorizationContextGatewayMock,
}));

describe("current user company access", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("allows a company-scoped permission only for the company present in the authorization context", async () => {
    getProtectedSessionMock.mockResolvedValue({ user: { id: "user-1" } });
    fetchSettingsAuthorizationContextGatewayMock.mockResolvedValue({
      success: true,
      data: {
        userId: "user-1",
        role: "CLIENTE_ADMIN",
        fallbackPermissions: [],
        globalPermissions: [],
        companyPermissions: {
          company_a: ["companies:view_cockpit"],
        },
        membershipCompanyIds: ["company_a", "company_b"],
      },
    });

    const { currentUserCanAccessCompany } = await import("../../src/features/user-access/application/current-user-access");

    await expect(currentUserCanAccessCompany("company_a", "companies:view_cockpit", "companies:view_all")).resolves.toBe(true);
    await expect(currentUserCanAccessCompany("company_b", "companies:view_cockpit", "companies:view_all")).resolves.toBe(false);
  });

  it("maps fallback scoped permission to membership companies when there is no explicit company assignment", async () => {
    getProtectedSessionMock.mockResolvedValue({ user: { id: "user-2" } });
    fetchSettingsAuthorizationContextGatewayMock.mockResolvedValue({
      success: true,
      data: {
        userId: "user-2",
        role: "CLIENTE_ADMIN",
        fallbackPermissions: ["companies:view_cockpit"],
        globalPermissions: [],
        companyPermissions: {},
        membershipCompanyIds: ["company_a"],
      },
    });

    const { currentUserCanAccessCompany } = await import("../../src/features/user-access/application/current-user-access");

    await expect(currentUserCanAccessCompany("company_a", "companies:view_cockpit", "companies:view_all")).resolves.toBe(true);
    await expect(currentUserCanAccessCompany("company_b", "companies:view_cockpit", "companies:view_all")).resolves.toBe(false);
  });
});
