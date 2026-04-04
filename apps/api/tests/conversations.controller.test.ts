import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationsController } from "../src/conversations.controller";
import { EvolutionClient } from "../src/integrations/evolution.client";

function createPrismaMock() {
  return {
    conversation: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    conversationMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    companyContact: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

describe("ConversationsController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.INTERNAL_API_KEY = "test-internal-key";
  });

  it("rejeita chamada sem x-internal-api-key", async () => {
    const prisma = createPrismaMock();
    const controller = new ConversationsController(prisma as never);

    await expect(controller.listConversations(undefined, "ATENDENDO")).rejects.toMatchObject({
      response: { message: "MISSING_INTERNAL_API_KEY" },
    });
  });

  it("lista conversas com sucesso", async () => {
    const prisma = createPrismaMock();
    prisma.conversation.findMany.mockResolvedValue([{ id: "conv-1", status: "IN_PROGRESS" }]);
    const controller = new ConversationsController(prisma as never);

    const result = await controller.listConversations("test-internal-key", "ATENDENDO");

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(prisma.conversation.findMany).toHaveBeenCalledTimes(1);
  });

  it("envia mensagem outbound para conversa existente", async () => {
    const prisma = createPrismaMock();
    prisma.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      status: "NEW",
      contactWhatsappSnapshot: "5511999999999",
    });
    prisma.conversationMessage.create.mockResolvedValue({ id: "msg-1" });
    prisma.conversation.update.mockResolvedValue({ id: "conv-1" });

    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(EvolutionClient, "fromRuntime").mockReturnValue({
      sendTextMessage,
    } as unknown as EvolutionClient);

    const controller = new ConversationsController(prisma as never);
    const result = await controller.sendConversationMessage("test-internal-key", {
      conversationId: "conv-1",
      text: "Ola cliente",
      userId: "user-1",
    });

    expect(result).toEqual({ success: true });
    expect(sendTextMessage).toHaveBeenCalledWith("5511999999999", "Ola cliente");
  });

  it("resolve conversa com sucesso", async () => {
    const prisma = createPrismaMock();
    prisma.conversation.update.mockResolvedValue({ id: "conv-1", status: "RESOLVED" });
    const controller = new ConversationsController(prisma as never);

    const result = await controller.resolveConversation("test-internal-key", {
      conversationId: "conv-1",
      userId: "user-1",
    });

    expect(result).toEqual({ success: true });
    expect(prisma.conversation.update).toHaveBeenCalledTimes(1);
  });
});
