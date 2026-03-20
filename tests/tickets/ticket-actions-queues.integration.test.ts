import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { type QueueKey } from "@/core/config/tickets-workflow";

const getProtectedSessionMock = vi.fn();
const getUserIdByEmailMock = vi.fn();
const searchOperationalTicketsMock = vi.fn();
const getTicketCountMock = vi.fn();
const getZammadRouteHealthMock = vi.fn();
const upsertOperationalTicketsToCacheMock = vi.fn();
const listCachedTicketsMock = vi.fn();

const prismaMock = {
  membership: { findMany: vi.fn() },
  user: { findMany: vi.fn() },
  zammadTicketCache: { count: vi.fn() },
};

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/core/infrastructure/gateways/zammad-gateway", () => ({
  ZammadGateway: {
    getUserIdByEmail: getUserIdByEmailMock,
    searchOperationalTickets: searchOperationalTicketsMock,
    getTicketCount: getTicketCountMock,
  },
}));

vi.mock("@/core/infrastructure/observability/zammad-observability", () => ({
  getZammadRouteHealth: getZammadRouteHealthMock,
}));

vi.mock("@/core/infrastructure/cache/zammad-ticket-cache", () => ({
  upsertOperationalTicketsToCache: upsertOperationalTicketsToCacheMock,
  listCachedTickets: listCachedTicketsMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const TOTALS: Record<QueueKey, number> = {
  all: 40,
  my_queue: 18,
  unassigned: 5,
  critical: 7,
  no_response: 12,
};

function getQueueFromQuery(query: string): QueueKey {
  if (query.includes("owner_id:99")) return "my_queue";
  if (query.includes("owner_id:null")) return "unassigned";
  if (query.includes("priority_id:3")) return "critical";
  if (query.includes("first_response_at:null")) return "no_response";
  return "all";
}

function makeTicket(queue: QueueKey, index: number) {
  const base = index + 1;
  return {
    id: base,
    number: String(5000 + base),
    title: `Ticket ${queue} ${base}`,
    group: "SUPORTE",
    state: queue === "all" ? "1. Novo" : queue === "critical" ? "2. Em Analise" : "7. Finalizado",
    state_id: queue === "all" ? 1 : queue === "critical" ? 2 : 7,
    priority_id: queue === "critical" ? 3 : 2,
    owner_id: queue === "my_queue" ? 99 : queue === "unassigned" ? null : 12,
    customer: "cliente@empresa.com",
    first_response_at: queue === "no_response" ? null : "2026-03-20T10:00:00.000Z",
    close_at: queue === "all" ? null : "2026-03-20T12:00:00.000Z",
    escalation_at: null,
    created_at: "2026-03-20T09:00:00.000Z",
    updated_at: "2026-03-20T13:00:00.000Z",
  };
}

describe("tickets integration: queue pagination/count consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    getUserIdByEmailMock.mockResolvedValue(99);

    searchOperationalTicketsMock.mockImplementation(async (query: string, options?: { limit?: number; page?: number }) => {
      const queue = getQueueFromQuery(query);
      const limit = options?.limit ?? 20;
      const page = options?.page ?? 1;
      const total = TOTALS[queue];
      const start = (page - 1) * limit;
      const count = Math.max(0, Math.min(limit, total - start));
      return Array.from({ length: count }, (_, i) => makeTicket(queue, start + i));
    });

    getTicketCountMock.mockImplementation(async (query: string) => {
      const queue = getQueueFromQuery(query);
      return TOTALS[queue];
    });

    getZammadRouteHealthMock.mockReturnValue({ stale: false, staleMinutes: 0 });
    upsertOperationalTicketsToCacheMock.mockResolvedValue(undefined);
    listCachedTicketsMock.mockResolvedValue({ rows: [], total: 0 });
  });

  const scenarios: Array<{ queue: QueueKey; expectedTotal: number }> = [
    { queue: "all", expectedTotal: TOTALS.all },
    { queue: "my_queue", expectedTotal: TOTALS.my_queue },
    { queue: "unassigned", expectedTotal: TOTALS.unassigned },
    { queue: "critical", expectedTotal: TOTALS.critical },
    { queue: "no_response", expectedTotal: TOTALS.no_response },
  ];

  it.each(scenarios)("queue=$queue retorna total consistente entre contador e pagina", async ({ queue, expectedTotal }) => {
    const { getTicketsAction } = await import("@/actions/tickets/ticket-actions");
    const result = await getTicketsAction({ queue, page: 1, pageSize: 10 });

    expect(result.success).toBe(true);
    expect(result.pagination.total).toBe(expectedTotal);
    expect(result.data.length).toBe(Math.min(10, expectedTotal));

    if (queue === "my_queue") {
      expect(result.data.every((ticket) => ticket.ownerId === 99)).toBe(true);
    }
    if (queue === "unassigned") {
      expect(result.data.every((ticket) => ticket.ownerId == null)).toBe(true);
    }
    if (queue === "critical") {
      expect(result.data.every((ticket) => ticket.priority === 3)).toBe(true);
    }
    if (queue === "no_response") {
      expect(result.data.every((ticket) => ticket.firstResponseAt == null)).toBe(true);
    }

    expect(result.queueCounts).toEqual({
      all: TOTALS.all,
      my_queue: TOTALS.my_queue,
      unassigned: TOTALS.unassigned,
      critical: TOTALS.critical,
      no_response: TOTALS.no_response,
    });

    const searchCall = searchOperationalTicketsMock.mock.calls.at(-1);
    expect(searchCall?.[0]).toContain("state_id:1");
    expect(searchCall?.[0]).toContain("state_id:7");
    expect(searchCall?.[0]).not.toContain("state_id:8");
    expect(searchCall?.[0]).not.toContain("state_id:9");
  });
});
