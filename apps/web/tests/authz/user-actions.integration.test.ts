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
    expect(result.message?.toLowerCase()).toContain("não pode remover");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("bloqueia vínculo de usuário interno por CLIENTE_ADMIN", async () => {
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
    expect(result.message?.toLowerCase()).toContain("não é permitido vincular usuário interno");
    expect(prismaMock.membership.upsert).not.toHaveBeenCalled();
  });
});


