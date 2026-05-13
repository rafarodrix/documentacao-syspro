import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocsService } from "../src/modules/docs/docs.service";

describe("DocsService", () => {
  const prisma = {
    $transaction: vi.fn(),
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const authorizationService = {
    getRequester: vi.fn(),
  };

  let service: DocsService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (operations: unknown[]) => operations);
    prisma.systemSetting.upsert.mockResolvedValue(undefined);
    prisma.user.update.mockResolvedValue(undefined);
    service = new DocsService(prisma as any, authorizationService as any);
  });

  it("maps audience segments from requester role", async () => {
    prisma.systemSetting.findUnique.mockResolvedValue({ value: null });
    prisma.user.findUnique.mockResolvedValue({ preferences: null });

    authorizationService.getRequester.mockResolvedValueOnce({
      userId: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });
    const adminView = await service.getViews({});
    expect(adminView.audienceSegment).toBe("admin");

    authorizationService.getRequester.mockResolvedValueOnce({
      userId: "support-1",
      email: "support@example.com",
      role: "SUPORTE",
    });
    const supportView = await service.getViews({});
    expect(supportView.audienceSegment).toBe("suporte");

    authorizationService.getRequester.mockResolvedValueOnce({
      userId: "client-1",
      email: "client@example.com",
      role: "CLIENTE_USER",
    });
    const clientView = await service.getViews({});
    expect(clientView.audienceSegment).toBe("cliente");
  });

  it("returns ranked view insights and lastRead from stored preferences", async () => {
    authorizationService.getRequester.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "SUPORTE",
    });

    prisma.systemSetting.findUnique
      .mockResolvedValueOnce({
        value: JSON.stringify({
          "/docs/a": { title: "A", count: 1, lastViewed: 10 },
          "/docs/b": { title: "B", count: 3, lastViewed: 20 },
        }),
      })
      .mockResolvedValueOnce({
        value: JSON.stringify({
          "/docs/x": { title: "X", count: 2, lastViewed: 15 },
        }),
      });
    prisma.user.findUnique.mockResolvedValue({
      preferences: {
        docs: {
          lastRead: {
            href: "/docs/x",
            title: "X",
            visitedAt: 99,
          },
        },
      },
    });

    const result = await service.getViews({});

    expect(result).toEqual({
      ok: true,
      audienceSegment: "suporte",
      globalPopular: [
        { href: "/docs/b", title: "B", count: 3, lastViewed: 20 },
        { href: "/docs/a", title: "A", count: 1, lastViewed: 10 },
      ],
      audiencePopular: [
        { href: "/docs/x", title: "X", count: 2, lastViewed: 15 },
      ],
      lastRead: {
        href: "/docs/x",
        title: "X",
        visitedAt: 99,
      },
    });
  });

  it("rejects invalid href when registering a view", async () => {
    authorizationService.getRequester.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "SUPORTE",
    });

    const result = await service.registerView({ href: "/portal/other", title: "Other", visitedAt: 123 }, {});

    expect(result).toEqual({ ok: false, error: "invalid_href" });
    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("stores global, audience and lastRead data when registering a view", async () => {
    authorizationService.getRequester.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      role: "DEVELOPER",
    });

    prisma.systemSetting.findUnique
      .mockResolvedValueOnce({
        value: JSON.stringify({
          "/docs/old": { title: "Old", count: 1, lastViewed: 5 },
        }),
      })
      .mockResolvedValueOnce({
        value: JSON.stringify({
          "/docs/new": { title: "Before", count: 2, lastViewed: 50 },
        }),
      });
    prisma.user.findUnique.mockResolvedValue({
      preferences: {
        docs: {
          theme: "compact",
        },
      },
    });

    const result = await service.registerView(
      {
        href: "/docs/new",
        title: "New title",
        visitedAt: 100,
      },
      {},
    );

    expect(result).toEqual({ ok: true });
    expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.systemSetting.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { key: "docs:popular:global" },
        update: expect.objectContaining({
          value: JSON.stringify({
            "/docs/old": { title: "Old", count: 1, lastViewed: 5 },
            "/docs/new": { title: "New title", count: 1, lastViewed: 100 },
          }),
        }),
      }),
    );
    expect(prisma.systemSetting.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { key: "docs:popular:audience:suporte" },
        update: expect.objectContaining({
          value: JSON.stringify({
            "/docs/new": { title: "New title", count: 3, lastViewed: 100 },
          }),
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        preferences: {
          docs: {
            theme: "compact",
            lastRead: {
              href: "/docs/new",
              title: "New title",
              visitedAt: 100,
            },
          },
        },
      },
    });
  });
});
