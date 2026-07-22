import { describe, expect, it, vi } from "vitest";
import { ContactsService } from "../src/modules/contacts/contacts.service";

const requester = { userId: "user-1", role: "CLIENTE_ADMIN", email: "admin@example.com" };

function createService() {
  const authorization = {
    getRequester: vi.fn().mockResolvedValue(requester),
    userHasPermission: vi.fn().mockResolvedValue(true),
    isSystemRole: vi.fn().mockReturnValue(false),
    resolveCompanyAccessScope: vi.fn().mockResolvedValue({ isGlobal: false, companyIds: ["company-1"] }),
    getManagedCompanyIds: vi.fn().mockResolvedValue(["company-1"]),
  };
  const orchestrator = {
    updateContact: vi.fn(),
  };

  return {
    authorization,
    orchestrator,
    service: new ContactsService(authorization as any, orchestrator as any),
  };
}

describe("ContactsService scoped contact linking", () => {
  it("allows a client admin to link an unlinked contact to a managed company", async () => {
    const { service, orchestrator } = createService();
    orchestrator.updateContact.mockImplementation(async (_id: string, _input: unknown, context: any) => {
      await context.assertContactManageableForUpdate({ companyLinks: [] }, ["company-1"]);
    });

    await expect(service.updateContact("contact-1", { companyIds: ["company-1"] } as any)).resolves.toBeUndefined();
  });

  it("does not allow a client admin to adopt an unlinked contact for another company", async () => {
    const { service, orchestrator } = createService();
    orchestrator.updateContact.mockImplementation(async (_id: string, _input: unknown, context: any) => {
      await context.assertContactManageableForUpdate({ companyLinks: [] }, ["company-2"]);
    });

    await expect(service.updateContact("contact-1", { companyIds: ["company-2"] } as any)).rejects.toThrow(
      "Contato informado nao pertence a uma empresa permitida.",
    );
  });
});
