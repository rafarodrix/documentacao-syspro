import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const getProtectedSessionMock = vi.fn();
const callWebApiMock = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/lib/web-api", () => ({
  callWebApi: callWebApiMock,
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
    expect(callWebApiMock).not.toHaveBeenCalled();
  });

  it("permite deleteUserAction para role ADMIN", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    callWebApiMock.mockResolvedValue(new Response(null, { status: 200 }));

    const { deleteUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await deleteUserAction("target-user");

    expect(result.success).toBe(true);
    expect(callWebApiMock).toHaveBeenCalledWith(
      expect.stringContaining("/users/target-user"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("cria usuario via createUserAction com permissao de ADMIN", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    callWebApiMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "new-user-1" }), { status: 200 }),
    );

    const { createUserAction } = await import("@/features/user-access/application/user-access-write.actions");
    const result = await createUserAction({
      name: "Usuario Teste",
      email: "usuario@empresa.com",
      password: "Senha@123",
      role: "CLIENTE_USER",
      companyId: "company-a",
    });

    expect(result.success).toBe(true);
    expect(callWebApiMock).toHaveBeenCalledWith(
      expect.stringContaining("/users"),
      expect.objectContaining({ method: "POST" }),
    );
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
    expect(callWebApiMock).not.toHaveBeenCalled();
  });
});
