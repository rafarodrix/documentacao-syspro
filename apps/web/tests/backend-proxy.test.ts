import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAgentIngressProxyHandler,
  createCatchAllProxyHandler,
  createInternalParamsProxyHandler,
  createInternalStaticProxyHandler,
  createParamsProxyHandler,
  createStaticProxyHandler,
} from "@/app/api/_shared/backend-proxy";

vi.mock("@/lib/backend-api", () => ({
  getBackendApiBaseUrl: () => "https://backend.example.com",
  withInternalApiHeaders: (headers: Headers) => {
    const nextHeaders = new Headers(headers);
    nextHeaders.set("x-internal-api-key", "test-internal-key");
    return nextHeaders;
  },
}));

describe("backend proxy handler factories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a static proxy handler and preserves internal headers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const handler = createStaticProxyHandler("/settings/sefaz/check/internal", {
      internal: true,
    });

    const response = await handler(
      new Request("https://portal.example.com/api/platform/settings/sefaz/check/internal?company=1"),
    );

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/settings/sefaz/check/internal?company=1",
      expect.objectContaining({
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        headers: expect.any(Headers),
      }),
    );
    const [, options] = fetchMock.mock.calls[0]!;
    expect((options?.headers as Headers).get("x-internal-api-key")).toBe("test-internal-key");
  });

  it("creates an internal static proxy handler", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const handler = createInternalStaticProxyHandler("/remote/sessions");

    await handler(
      new Request("https://portal.example.com/api/remote/sessions?page=1"),
    );

    const [, options] = fetchMock.mock.calls[0]!;
    expect((options?.headers as Headers).get("x-internal-api-key")).toBe("test-internal-key");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/remote/sessions?page=1",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("preserves the incoming internal api key for agent ingress handlers", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const handler = createAgentIngressProxyHandler("/remote/agents/discover");
    const request = new Request("https://portal.example.com/api/remote/agents/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-api-key": "agent-sent-key",
      },
      body: JSON.stringify({ machineName: "SERVIDOR" }),
    });

    const response = await handler(request);

    expect(response.status).toBe(202);
    const [, options] = fetchMock.mock.calls[0]!;
    expect((options?.headers as Headers).get("x-internal-api-key")).toBe("agent-sent-key");
  });

  it("creates a params proxy handler", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const handler = createParamsProxyHandler<{ id: string }>(
      ({ id }) => `/settings/permissions/assignments/${id}`,
    );

    const response = await handler(
      new Request("https://portal.example.com/api/platform/settings/permissions/assignments/assignment_1"),
      { params: Promise.resolve({ id: "assignment_1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/settings/permissions/assignments/assignment_1",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("creates a catch-all proxy handler", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 202 }),
    );
    const handler = createCatchAllProxyHandler("/tickets");

    const response = await handler(
      new Request("https://portal.example.com/api/tickets/123/reply?draft=true"),
      { params: Promise.resolve({ all: ["123", "reply"] }) },
    );

    expect(response.status).toBe(202);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/tickets/123/reply?draft=true",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("creates an internal params proxy handler with multiple params", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const handler = createInternalParamsProxyHandler<{ id: string; updateId: string }>(
      ({ id, updateId }) => `/remote/hosts/${id}/syspro-updates/${updateId}`,
    );

    const response = await handler(
      new Request("https://portal.example.com/api/remote/hosts/host_1/syspro-updates/update_1"),
      { params: Promise.resolve({ id: "host_1", updateId: "update_1" }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example.com/remote/hosts/host_1/syspro-updates/update_1",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
    const [, options] = fetchMock.mock.calls[0]!;
    expect((options?.headers as Headers).get("x-internal-api-key")).toBe("test-internal-key");
  });
});
