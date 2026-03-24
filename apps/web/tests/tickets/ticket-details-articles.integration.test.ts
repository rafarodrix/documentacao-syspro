import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const getProtectedSessionMock = vi.fn();
const getScopedCompanyZammadEmailsMock = vi.fn();
const canAccessTicketForCustomerEmailsMock = vi.fn();
const getTicketByIdMock = vi.fn();
const getTicketArticlesMock = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/features/tickets/infrastructure/gateways/zammad-gateway", () => ({
  ZammadGateway: {
    canAccessTicketForCustomerEmails: canAccessTicketForCustomerEmailsMock,
    getTicketById: getTicketByIdMock,
    getTicketArticles: getTicketArticlesMock,
  },
}));

vi.mock("@/features/tickets/application/services/ticket-scope.service", async () => {
  const actual = await vi.importActual<object>("@/features/tickets/application/services/ticket-scope.service");
  return {
    ...actual,
    getScopedCompanyZammadEmails: getScopedCompanyZammadEmailsMock,
  };
});

describe("tickets integration: ticket details article shape", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProtectedSessionMock.mockResolvedValue({
      role: Role.CLIENTE_ADMIN,
      userId: "client-admin-1",
      email: "gestor@empresa.com",
    });

    getScopedCompanyZammadEmailsMock.mockResolvedValue(["gestor@empresa.com"]);
    canAccessTicketForCustomerEmailsMock.mockResolvedValue(true);
    getTicketByIdMock.mockResolvedValue({
      id: 77,
      title: "Chamado de teste",
      state: "1. Novo",
      number: "7700",
      priority_id: 2,
      owner_id: 15,
      updated_at: "2026-03-23T10:00:00.000Z",
      first_response_at: null,
      close_at: null,
      created_at: "2026-03-23T09:00:00.000Z",
    });
  });

  it("normaliza artigos com sender mesmo quando a API nao informa o campo", async () => {
    getTicketArticlesMock.mockResolvedValue([
      {
        id: 1,
        from: "Analista <suporte@syspro.com>",
        body: "<p>Retorno inicial</p>",
        created_at: "2026-03-23T10:05:00.000Z",
        internal: false,
      },
    ]);

    const { getTicketDetailsAction } = await import("@/features/tickets/application/actions");
    const result = await getTicketDetailsAction("77");

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]).toEqual(
      expect.objectContaining({
        id: 1,
        from: "Analista <suporte@syspro.com>",
        sender: "Agent",
        isInternal: false,
      }),
    );
  });
});
