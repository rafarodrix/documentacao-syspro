import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const getProtectedSessionMock = vi.fn();
const revalidatePathMock = vi.fn();

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
      signUpEmail: vi.fn(),
      admin: { removeUser: vi.fn() },
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

  it("bloqueia vinculo de usuario interno por CLIENTE_ADMIN", async () => {
    getProtectedSessionMock.mockResolvedValue({
      role: Role.CLIENTE_ADMIN,
      userId: "manager-1",
      email: "gestor@empresa.com",
    });

    prismaMock.membership.findMany.mockResolvedValue([{ companyId: "company-a" }]);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "internal-user",
      role: Role.ADMIN,
      deletedAt: null,
    });

    const { linkUserToCompanyAction } = await import("@/features/user-access/application/actions");
    const result = await linkUserToCompanyAction({
      email: "admin@sistema.com",
      role: Role.CLIENTE_USER,
      companyId: "company-a",
    });

    expect(result.success).toBe(false);
    expect(result.message?.toLowerCase()).toContain("n\u00E3o \u00E9 permitido vincular usu\u00E1rio interno");
    expect(prismaMock.membership.upsert).not.toHaveBeenCalled();
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
});
