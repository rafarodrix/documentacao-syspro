import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const getProtectedSessionMock = vi.fn();
const trpcRemoveMutate = vi.fn();
const trpcCreateMutate = vi.fn();
const trpcUpdateMutate = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/lib/api/trpc-client", () => ({
  trpc: {
    users: {
      remove: { mutate: trpcRemoveMutate },
      create: { mutate: trpcCreateMutate },
      update: { mutate: trpcUpdateMutate },
    },
  },
}));

vi.mock("@dosc-syspro/shared/action-rate-limit", () => ({
  consumeActionRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfterSeconds: 0 }),
}));

vi.mock("@/lib/security/request-context", () => ({
  getRequestIp: vi.fn().mockResolvedValue("127.0.0.1"),
}));

vi.mock("@dosc-syspro/shared/action-error-handler", () => ({
  handleActionError: vi.fn((error: unknown) => ({
    success: false,
    message: error instanceof Error ? error.message : "Erro desconhecido.",
  })),
}));

vi.mock("@/features/settings/infrastructure/gateways/settings.gateway", () => ({
  fetchSettingsAuthorizationContextGateway: vi.fn().mockResolvedValue({ success: false }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/cache-invalidation", () => ({
  revalidateCadastrosViews: vi.fn(),
}));

describe("authorization integration: user actions hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia deleteUserAction para CLIENTE_USER sem permissao users:status", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.CLIENTE_USER,
      userId: "user-1",
      email: "user@empresa.com",
    });

    const { deleteUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await deleteUserAction("target-user");

    expect(result.success).toBe(false);
    expect(trpcRemoveMutate).not.toHaveBeenCalled();
  });

  it("permite deleteUserAction para role ADMIN", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    trpcRemoveMutate.mockResolvedValue(undefined);

    const { deleteUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await deleteUserAction("target-user");

    expect(result.success).toBe(true);
    expect(trpcRemoveMutate).toHaveBeenCalledWith({ id: "target-user" });
  });

  it("cria usuario via createUserAction com permissao de ADMIN", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    trpcCreateMutate.mockResolvedValue({ id: "new-user-1" });

    const { createUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await createUserAction({
      name: "Usuario Teste",
      email: "usuario@empresa.com",
      password: "Senha@123",
      role: "CLIENTE_USER",
      companyId: "company-a",
    });

    expect(result.success).toBe(true);
    expect(trpcCreateMutate).toHaveBeenCalled();
  });

  it("bloqueia createUserAction para CLIENTE_USER sem permissao users:create", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.CLIENTE_USER,
      userId: "user-1",
      email: "user@empresa.com",
    });

    const { createUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await createUserAction({
      name: "Usuario Teste",
      email: "usuario@empresa.com",
      password: "Senha@123",
      role: "CLIENTE_USER",
      companyId: "company-a",
    });

    expect(result.success).toBe(false);
    expect(trpcCreateMutate).not.toHaveBeenCalled();
  });
});
