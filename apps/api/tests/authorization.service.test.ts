import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationService } from "../src/modules/authorization/authorization.service";

describe("AuthorizationService RBAC persistence", () => {
  const authService = {
    auth: {
      api: {
        getSession: vi.fn(),
      },
    },
  };

  const prisma = {
    $transaction: vi.fn(),
    permission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    accessProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    accessProfilePermission: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    userAccessProfile: {
      findMany: vi.fn(),
    },
  };

  let service: AuthorizationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthorizationService(prisma as any, authService as any);
  });

  it("uses persisted system-profile permissions without re-adding legacy defaults", async () => {
    vi.spyOn(service, "syncSystemAuthorizationCatalog").mockResolvedValue(undefined);

    prisma.accessProfile.findUnique.mockResolvedValue({
      isSystem: true,
      permissions: [
        {
          permission: {
            key: "dashboard:view",
          },
        },
      ],
    });
    prisma.userAccessProfile.findMany.mockResolvedValue([]);

    const requester = {
      userId: "user-1",
      email: "user@example.com",
      role: "SUPORTE",
    };

    await expect(service.userHasPermission(requester as any, "dashboard:view")).resolves.toBe(true);
    await expect(service.userHasPermission(requester as any, "tools:all")).resolves.toBe(false);
  });

  it("preserves permissions of existing system profiles during catalog sync", async () => {
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<void>) => callback(prisma as any));
    prisma.accessProfile.findUnique.mockResolvedValue({ id: "profile-1" });

    await service.syncSystemAuthorizationCatalog();

    expect(prisma.accessProfile.update).toHaveBeenCalled();
    expect(prisma.accessProfilePermission.deleteMany).not.toHaveBeenCalled();
    expect(prisma.accessProfilePermission.createMany).not.toHaveBeenCalled();
  });
});
