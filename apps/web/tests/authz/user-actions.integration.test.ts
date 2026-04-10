import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const getProtectedSessionMock = vi.fn();
const revalidatePathMock = vi.fn();
const createUserMock = vi.fn();
const removeUserMock = vi.fn();

const prismaMock = {
  membership: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/auth-helpers", () => ({
  getProtectedSession: getProtectedSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      createUser: createUserMock,
      removeUser: removeUserMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

describe("authorization integration: user actions hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia deleteUserAction para CLIENTE_ADMIN fora do escopo da empresa", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.CLIENTE_ADMIN,
      userId: "manager-1",
      email: "gestor@empresa.com",
    });

    prismaMock.user.findUnique.mockResolvedValue({ role: Role.CLIENTE_USER, deletedAt: null });
    prismaMock.membership.findMany.mockResolvedValue([{ companyId: "company-a" }]);
    prismaMock.membership.findFirst.mockResolvedValue(null);

    const { deleteUserAction } = await import("@/features/user-access/application/actions");
    const result = await deleteUserAction("target-user");

    expect(result.success).toBe(false);
    expect(result.message?.toLowerCase()).toContain("n\u00E3o pode remover");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("permite deleteUserAction para role interna", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    prismaMock.user.update.mockResolvedValue({ id: "target-user" });

    const { deleteUserAction } = await import("@/features/user-access/application/actions");
    const result = await deleteUserAction("target-user");

    expect(result.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: expect.objectContaining({ isActive: false }),
    });
  });

  it("cria usuario via admin.createUser sem depender de sign-up publico", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    createUserMock.mockResolvedValue({ user: { id: "auth-user-1" } });
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        user: { update: vi.fn().mockResolvedValue({ id: "auth-user-1" }) },
        membership: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }),
    );

    const { createUserAction } = await import("@/features/user-access/application/actions");
    const result = await createUserAction({
      name: "Usuario Teste",
      email: "usuario@empresa.com",
      password: "123456",
      role: "CLIENTE_USER",
      companyId: "company-a",
    });

    expect(result.success).toBe(true);
    expect(createUserMock).toHaveBeenCalledWith({
      body: expect.objectContaining({
        email: "usuario@empresa.com",
        password: "123456",
        name: "Usuario Teste",
        role: "user",
      }),
      headers: expect.any(Headers),
    });
    expect(removeUserMock).not.toHaveBeenCalled();
  });

  it("executa rollback no auth quando a transacao do banco falha", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.ADMIN,
      userId: "admin-1",
      email: "admin@syspro.com",
    });

    createUserMock.mockResolvedValue({ user: { id: "auth-user-rollback" } });
    prismaMock.$transaction.mockRejectedValue(new Error("falha no banco"));

    const { createUserAction } = await import("@/features/user-access/application/actions");
    const result = await createUserAction({
      name: "Usuario Rollback",
      email: "rollback@empresa.com",
      password: "123456",
      role: "CLIENTE_USER",
      companyId: "company-a",
    });

    expect(result.success).toBe(false);
    expect(removeUserMock).toHaveBeenCalledWith({
      body: { userId: "auth-user-rollback" },
      headers: expect.any(Headers),
    });
  });
});
