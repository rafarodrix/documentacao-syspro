"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const whatsapp_controller_1 = require("../src/whatsapp.controller");
const evolution_client_1 = require("../src/integrations/evolution.client");
function createInboundServiceMock() {
    return {
        handleInboundMessage: vitest_1.vi.fn(),
    };
}
(0, vitest_1.describe)("WhatsAppController", () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.restoreAllMocks();
        process.env.INTERNAL_API_KEY = "test-internal-key";
        process.env.EVOLUTION_WEBHOOK_SECRET = "test-webhook-secret";
    });
    (0, vitest_1.it)("rejeita webhook com apikey Evolution invalida", async () => {
        const inboundService = createInboundServiceMock();
        const controller = new whatsapp_controller_1.WhatsAppController(inboundService);
        await (0, vitest_1.expect)(controller.handleEvolutionWebhook({ event: "MESSAGE", data: {} }, "wrong-secret", "test-internal-key")).rejects.toMatchObject({
            response: { message: "Unauthorized" },
        });
    });
    (0, vitest_1.it)("ignora eventos nao-MESSAGE", async () => {
        const inboundService = createInboundServiceMock();
        const controller = new whatsapp_controller_1.WhatsAppController(inboundService);
        const result = await controller.handleEvolutionWebhook({ event: "CONNECTION", data: { state: "open" } }, "test-webhook-secret", "test-internal-key");
        (0, vitest_1.expect)(result).toEqual({ status: "ignored_event", event: "CONNECTION" });
        (0, vitest_1.expect)(inboundService.handleInboundMessage).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("processa inbound MESSAGE e envia confirmacao", async () => {
        const inboundService = createInboundServiceMock();
        inboundService.handleInboundMessage.mockResolvedValue({
            success: true,
            ticketNumber: "12345",
            duplicate: false,
        });
        const controller = new whatsapp_controller_1.WhatsAppController(inboundService);
        const sendTextMessage = vitest_1.vi.fn().mockResolvedValue(undefined);
        vitest_1.vi.spyOn(evolution_client_1.EvolutionClient, "fromRuntime").mockReturnValue({
            sendTextMessage,
        });
        const payload = {
            event: "MESSAGE",
            data: {
                Info: {
                    Chat: "5511999999999@s.whatsapp.net",
                    IsFromMe: false,
                    PushName: "Cliente Teste",
                    ID: "msg-external-1",
                },
                Message: {
                    conversation: "Preciso de suporte",
                },
            },
        };
        const result = await controller.handleEvolutionWebhook(payload, "test-webhook-secret", "test-internal-key");
        (0, vitest_1.expect)(result).toEqual({
            success: true,
            status: "processed",
            duplicate: false,
            ticketNumber: "12345",
        });
        (0, vitest_1.expect)(inboundService.handleInboundMessage).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(sendTextMessage).toHaveBeenCalledTimes(1);
    });
});
