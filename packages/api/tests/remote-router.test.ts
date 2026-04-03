import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, callProcedure } from "../src/router";
import { createApiContext } from "../src/context";
import { remoteRouter } from "../src/routers/remote";

const { createTrilinkRemoteMock } = vi.hoisted(() => ({
  createTrilinkRemoteMock: vi.fn(),
}));

vi.mock("@dosc-syspro/remote-domain", async () => {
  const actual = await vi.importActual("@dosc-syspro/remote-domain");

  return {
    ...actual,
    createTrilinkRemote: createTrilinkRemoteMock,
  };
});

vi.mock("../src/remote-domain-ports", () => ({
  createRemoteDiscoverPort: vi.fn(() => ({})),
  createRemoteBootstrapPort: vi.fn(() => ({})),
  createRemoteSyncPort: vi.fn(() => ({})),
  createRemoteAckPort: vi.fn(() => ({})),
  createRemoteSessionPort: vi.fn(() => ({})),
  createRemoteHostAdminPort: vi.fn(() => ({})),
  createRemoteAddressBookPort: vi.fn(() => ({})),
  revokeExpiredSyncAgentToken: vi.fn(async () => undefined),
}));

describe("remoteRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticated route derives scope from session and ignores payload scope", async () => {
    const listAddressBook = vi.fn(async (input: unknown) => ({
      ok: true,
      input,
    }));

    createTrilinkRemoteMock.mockReturnValue({
      listAddressBook,
    });

    const ctx = createApiContext({
      session: {
        userId: "user-1",
        role: "SUPORTE",
        companyIds: ["company-a", "company-b"],
      },
    });

    const result = await callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "addressBookList",
      input: {
        payload: {
          scope: {
            isGlobalView: false,
            companyIds: ["forged-company"],
          },
        },
      },
    });

    expect(listAddressBook).toHaveBeenCalledTimes(1);
    expect(listAddressBook).toHaveBeenCalledWith({
      scope: {
        isGlobalView: true,
        companyIds: [],
      },
    });

    expect(result).toEqual({
      ok: true,
      input: {
        scope: {
          isGlobalView: true,
          companyIds: [],
        },
      },
    });
  });

  it("maps remote-domain typed errors to ApiError with remote metadata", async () => {
    createTrilinkRemoteMock.mockReturnValue({
      createHost: vi.fn(async () => {
        throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
      }),
    });

    const ctx = createApiContext({
      session: {
        userId: "admin-1",
        role: "ADMIN",
        companyIds: [],
      },
    });

    const act = callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "hostsCreate",
      input: {
        payload: {
          companyId: "c1",
          name: "Host 01",
          agentExternalId: "abc",
        },
      },
    });

    await expect(act).rejects.toBeInstanceOf(ApiError);

    try {
      await act;
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe("BAD_REQUEST");
      expect(apiError.cause).toMatchObject({
        remote: {
          code: "HOST_AGENT_EXTERNAL_ID_INVALID",
          httpStatus: 400,
        },
      });
    }
  });

  it("blocks authenticated procedure when session is missing", async () => {
    const ctx = createApiContext({ session: null });

    const act = callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "addressBookList",
      input: {
        payload: {},
      },
    });

    await expect(act).rejects.toBeInstanceOf(ApiError);
    await expect(act).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Nao autenticado.",
    });

    expect(createTrilinkRemoteMock).not.toHaveBeenCalled();
  });

  it("rejects discover payload when schemaVersion is missing", async () => {
    const ctx = createApiContext({ session: null });

    const act = callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "discover",
      input: {
        payload: {
          discoveryToken: "DISCOVERY_TOKEN",
        },
      },
    });

    await expect(act).rejects.toBeInstanceOf(ApiError);
    await expect(act).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Payload invalido para rota remota.",
    });

    expect(createTrilinkRemoteMock).not.toHaveBeenCalled();
  });

  it("rejects sync payload when schemaVersion is unsupported", async () => {
    const ctx = createApiContext({ session: null });

    const act = callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "sync",
      input: {
        payload: {
          schemaVersion: "sync.payload.v0",
          agentToken: "token",
        },
      },
    });

    await expect(act).rejects.toBeInstanceOf(ApiError);
    await expect(act).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Payload invalido para rota remota.",
    });

    expect(createTrilinkRemoteMock).not.toHaveBeenCalled();
  });

  it("maps ACK failed without reasonCode to BAD_REQUEST metadata", async () => {
    createTrilinkRemoteMock.mockReturnValue({
      processAck: vi.fn(async () => {
        throw new Error("ACK_REASON_CODE_REQUIRED");
      }),
    });

    const ctx = createApiContext({ session: null });

    const act = callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "ack",
      input: {
        payload: {
          schemaVersion: "ack.payload.v1",
          agentToken: "token",
          commandId: "cmd-1",
          status: "FAILED",
        },
      },
    });

    await expect(act).rejects.toBeInstanceOf(ApiError);

    try {
      await act;
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.code).toBe("BAD_REQUEST");
      expect(apiError.cause).toMatchObject({
        remote: {
          code: "ACK_REASON_CODE_REQUIRED",
          httpStatus: 400,
        },
      });
    }
  });

  it("keeps structured discover flow token_invalid", async () => {
    const processDiscover = vi.fn(async () => ({
      contractVersion: "discover.v2",
      mode: "linked",
      discoveredHostId: "disc-1",
      hostId: "host-1",
      hostName: "SERVER-01",
      heartbeatAuth: "agentToken",
      bootstrapFlow: "token_invalid",
      transition: {
        state: "DISCOVERY_LINKED_HOST_TOKEN_INVALID",
        nextStep: "run_authenticated_bootstrap",
        nextEndpoint: "/api/remote/rustdesk/bootstrap",
        allowDiscoveryHeartbeat: false,
        requiresAuthenticatedBootstrap: false,
      },
      message: "token invalid",
    }));

    createTrilinkRemoteMock.mockReturnValue({ processDiscover });

    const ctx = createApiContext({ session: null });

    const result = await callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "discover",
      input: {
        payload: {
          schemaVersion: "discover.payload.v1",
          discoveryToken: "DISCOVERY_TOKEN",
          rustdeskId: "1234567",
        },
      },
    });

    expect(result).toMatchObject({
      bootstrapFlow: "token_invalid",
    });
  });

  it("keeps structured discover flow host_bootstrap_required", async () => {
    const processDiscover = vi.fn(async () => ({
      contractVersion: "discover.v2",
      mode: "linked",
      discoveredHostId: "disc-1",
      hostId: "host-1",
      hostName: "SERVER-01",
      heartbeatAuth: "agentToken",
      bootstrapFlow: "host_bootstrap_required",
      transition: {
        state: "DISCOVERY_LINKED_HOST_BOOTSTRAP_REQUIRED",
        nextStep: "run_authenticated_bootstrap",
        nextEndpoint: "/api/remote/rustdesk/bootstrap",
        allowDiscoveryHeartbeat: false,
        requiresAuthenticatedBootstrap: false,
      },
      message: "bootstrap required",
    }));

    createTrilinkRemoteMock.mockReturnValue({ processDiscover });

    const ctx = createApiContext({ session: null });

    const result = await callProcedure<{ payload: unknown }, unknown>({
      ctx,
      namespace: "remote",
      router: remoteRouter,
      procedure: "discover",
      input: {
        payload: {
          schemaVersion: "discover.payload.v1",
          discoveryToken: "DISCOVERY_TOKEN",
          rustdeskId: "1234567",
        },
      },
    });

    expect(result).toMatchObject({
      bootstrapFlow: "host_bootstrap_required",
    });
  });
});
