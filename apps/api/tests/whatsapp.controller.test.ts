import { beforeEach, describe, expect, it, vi } from "vitest";
import { WhatsAppController } from "../src/modules/whatsapp/controllers/whatsapp.controller";
import { EvolutionClient } from "../src/modules/integrations/clients/evolution.client";

function createInboundServiceMock() {
  return {
    handleInboundMessage: vi.fn(),
  };
}

describe("WhatsAppController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.INTERNAL_API_KEY = "test-internal-key";
    process.env.EVOLUTION_WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("rejeita webhook com apikey Evolution invalida", async () => {
    const inboundService = createInboundServiceMock();
    const controller = new WhatsAppController(inboundService as never);

    await expect(
      controller.handleEvolutionWebhook(
        { event: "MESSAGE", data: {} },
        "wrong-secret",
        "test-internal-key",
      ),
    ).rejects.toMatchObject({
      response: { message: "Unauthorized" },
    });
  });

  it("ignora eventos nao-MESSAGE", async () => {
    const inboundService = createInboundServiceMock();
    const controller = new WhatsAppController(inboundService as never);

    const result = await controller.handleEvolutionWebhook(
      { event: "CONNECTION", data: { state: "open" } },
      "test-webhook-secret",
      "test-internal-key",
    );

    expect(result).toEqual({ status: "ignored_event", event: "CONNECTION" });
    expect(inboundService.handleInboundMessage).not.toHaveBeenCalled();
  });

  it("processa inbound MESSAGE e envia confirmacao", async () => {
    const inboundService = createInboundServiceMock();
    inboundService.handleInboundMessage.mockResolvedValue({
      success: true,
      ticketNumber: "12345",
      duplicate: false,
    });
    const controller = new WhatsAppController(inboundService as never);

    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(EvolutionClient, "fromRuntime").mockReturnValue({
      sendTextMessage,
    } as unknown as EvolutionClient);

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

    const result = await controller.handleEvolutionWebhook(
      payload,
      "test-webhook-secret",
      "test-internal-key",
    );

    expect(result).toEqual({
      success: true,
      status: "processed",
      duplicate: false,
      ticketNumber: "12345",
    });
    expect(inboundService.handleInboundMessage).toHaveBeenCalledTimes(1);
    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });
});
