import { describe, expect, it, vi, afterEach } from "vitest";
import {
  RemoteApiClientError,
  parseRemoteApiResponse,
  requestRemoteMutation,
} from "@/features/remote/interface/remote-api";

describe("remote-api parser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps 429 to actionable rate-limit message", async () => {
    const response = new Response(
      JSON.stringify({
        success: false,
        code: "RATE_LIMITED",
        message: "too many requests",
        httpStatus: 429,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );

    await expect(parseRemoteApiResponse(response)).rejects.toMatchObject({
      message: "Limite de requisicoes atingido. Aguarde alguns segundos e tente novamente.",
      code: "RATE_LIMITED",
      httpStatus: 429,
    });
  });

  it("maps 409 session conflict code to actionable message", async () => {
    const response = new Response(
      JSON.stringify({
        success: false,
        code: "SESSION_DUPLICATE_OPEN",
        message: "duplicate session",
        httpStatus: 409,
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );

    await expect(parseRemoteApiResponse(response)).rejects.toMatchObject({
      message: "Ja existe sessao aberta para este ticket e host.",
      code: "SESSION_DUPLICATE_OPEN",
      httpStatus: 409,
    });
  });

  it("requestRemoteMutation serializes body and parses success payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { id: "cmd_1" },
          message: "ok",
          httpStatus: 200,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await requestRemoteMutation<{ id: string }>({
      url: "/api/remote/test",
      method: "POST",
      body: { a: 1 },
    });

    expect(result.data.id).toBe("cmd_1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/remote/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ a: 1 }),
      }),
    );
  });
});