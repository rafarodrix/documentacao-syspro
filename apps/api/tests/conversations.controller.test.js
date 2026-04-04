"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const conversations_controller_1 = require("../src/conversations.controller");
const evolution_client_1 = require("../src/integrations/evolution.client");
function createPrismaMock() {
    return {
        conversation: {
            findMany: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            findFirst: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
        },
        conversationMessage: {
            findMany: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
        },
        companyContact: {
            findFirst: vitest_1.vi.fn(),
            findUnique: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
        },
    };
}
(0, vitest_1.describe)("ConversationsController", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.restoreAllMocks();
        process.env.INTERNAL_API_KEY = "test-internal-key";
    });
    (0, vitest_1.it)("rejeita chamada sem x-internal-api-key", async () => {
        const prisma = createPrismaMock();
        const controller = new conversations_controller_1.ConversationsController(prisma);
        await (0, vitest_1.expect)(controller.listConversations(undefined, "ATENDENDO")).rejects.toMatchObject({
            response: { message: "MISSING_INTERNAL_API_KEY" },
        });
    });
    (0, vitest_1.it)("lista conversas com sucesso", async () => {
        const prisma = createPrismaMock();
        prisma.conversation.findMany.mockResolvedValue([{ id: "conv-1", status: "IN_PROGRESS" }]);
        const controller = new conversations_controller_1.ConversationsController(prisma);
        const result = await controller.listConversations("test-internal-key", "ATENDENDO");
        (0, vitest_1.expect)(result.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(result.data)).toBe(true);
        (0, vitest_1.expect)(prisma.conversation.findMany).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)("envia mensagem outbound para conversa existente", async () => {
        const prisma = createPrismaMock();
        prisma.conversation.findUnique.mockResolvedValue({
            id: "conv-1",
            status: "NEW",
            contactWhatsappSnapshot: "5511999999999",
        });
        prisma.conversationMessage.create.mockResolvedValue({ id: "msg-1" });
        prisma.conversation.update.mockResolvedValue({ id: "conv-1" });
        const sendTextMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
        vitest_1.vi.spyOn(evolution_client_1.EvolutionClient, "fromRuntime").mockReturnValue({
            sendTextMessage,
        });
        const controller = new conversations_controller_1.ConversationsController(prisma);
        const result = await controller.sendConversationMessage("test-internal-key", {
            conversationId: "conv-1",
            text: "Ola cliente",
            userId: "user-1",
        });
        (0, vitest_1.expect)(result).toEqual({ success: true });
        (0, vitest_1.expect)(sendTextMessage).toHaveBeenCalledWith("5511999999999", "Ola cliente");
    });
    (0, vitest_1.it)("resolve conversa com sucesso", async () => {
        const prisma = createPrismaMock();
        prisma.conversation.update.mockResolvedValue({ id: "conv-1", status: "RESOLVED" });
        const controller = new conversations_controller_1.ConversationsController(prisma);
        const result = await controller.resolveConversation("test-internal-key", {
            conversationId: "conv-1",
            userId: "user-1",
        });
        (0, vitest_1.expect)(result).toEqual({ success: true });
        (0, vitest_1.expect)(prisma.conversation.update).toHaveBeenCalledTimes(1);
    });
});
