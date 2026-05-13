import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocsRouter } from "../src/modules/docs/docs.router";
import { TrpcService } from "../src/modules/trpc/trpc.service";

describe("DocsRouter", () => {
  const docsService = {
    getViews: vi.fn(),
    registerView: vi.fn(),
  };

  let router: DocsRouter;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new DocsRouter(new TrpcService(), docsService as any);
  });

  it("forwards getViews to DocsService with request headers", async () => {
    docsService.getViews.mockResolvedValue({ ok: true, audienceSegment: "cliente", globalPopular: [], audiencePopular: [], lastRead: null });
    const headers = { cookie: "session=abc" };
    const caller = router.router.createCaller({ headers, req: {} as any, res: {} as any });

    const result = await caller.getViews();

    expect(docsService.getViews).toHaveBeenCalledWith(headers);
    expect(result.ok).toBe(true);
  });

  it("validates and forwards registerView payload", async () => {
    docsService.registerView.mockResolvedValue({ ok: true });
    const headers = { cookie: "session=abc" };
    const caller = router.router.createCaller({ headers, req: {} as any, res: {} as any });

    const result = await caller.registerView({
      href: "/docs/arquitetura",
      title: "Arquitetura",
      visitedAt: 123,
    });

    expect(docsService.registerView).toHaveBeenCalledWith(
      {
        href: "/docs/arquitetura",
        title: "Arquitetura",
        visitedAt: 123,
      },
      headers,
    );
    expect(result).toEqual({ ok: true });
  });

  it("returns success for submitFeedback", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const caller = router.router.createCaller({ headers: {}, req: {} as any, res: {} as any });

    const result = await caller.submitFeedback({
      slug: "/docs/arquitetura",
      title: "Arquitetura",
      helpful: true,
      reason: null,
      votedAt: "2026-05-13T12:00:00.000Z",
    });

    expect(infoSpy).toHaveBeenCalledWith(
      "[docs.feedback] from tRPC",
      expect.objectContaining({
        slug: "/docs/arquitetura",
        title: "Arquitetura",
      }),
    );
    expect(result).toEqual({ ok: true });
    infoSpy.mockRestore();
  });
});
