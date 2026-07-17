import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("auth-helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    headersMock.mockResolvedValue(
      new Headers({
        host: "portal.example.com",
        "x-forwarded-proto": "https",
        cookie: "session=abc",
      }),
    );
  });

  it("retries protected-session once after a transient upstream failure", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "proxy failure" }), { status: 502 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            userId: "user-1",
            email: "user@example.com",
            role: "SUPORTE",
            name: "Rafael",
            image: null,
          }),
          { status: 200 },
        ),
      );

    const { getProtectedSession } = await import("@/lib/auth-helpers");
    const session = await getProtectedSession();

    expect(session).toEqual({
      userId: "user-1",
      email: "user@example.com",
      role: "SUPORTE",
      name: "Rafael",
      image: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://portal.example.com/api/auth/protected-session",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: {
          accept: "application/json",
          cookie: "session=abc",
        },
      }),
    );
  });

  it("does not retry non-transient auth responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 401 }),
    );

    const { getProtectedSession } = await import("@/lib/auth-helpers");
    const session = await getProtectedSession();

    expect(session).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
