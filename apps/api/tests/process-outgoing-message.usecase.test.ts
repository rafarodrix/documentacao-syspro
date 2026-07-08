import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessOutgoingMessageUseCase } from "../src/modules/integrations/messaging/application/process-outgoing-message.usecase";

describe("ProcessOutgoingMessageUseCase replies", () => {
  const evolutionClient = {
    sendTextMessage: vi.fn(),
    sendMedia: vi.fn(),
    sendStickerMessage: vi.fn(),
  };

  const chatwootClient = {
    getConversationDetails: vi.fn(),
    resolveAttachmentPayload: vi.fn(),
    updateContact: vi.fn(),
  };

  const prisma = {
    conversationLink: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    messageLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  const dedupService = {
    claim: vi.fn(),
  };

  const integrationContext = {
    resolveForChatwootWebhook: vi.fn(),
    resolveByConnectionKey: vi.fn(),
  };

  const connection = {
    connectionKey: "env:default",
    connectionId: "conn-1",
    companyId: "company-1",
    chatwoot: {
      url: "https://chat.example.com",
      apiToken: "token",
      accountId: "1",
      inboxId: "2",
      inboxIdentifier: "whatsapp",
    },
    evolution: {
      apiUrl: "https://evolution.example.com",
      apiKey: "key",
      instance: "instance-1",
    },
  };

  let service: ProcessOutgoingMessageUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    dedupService.claim.mockResolvedValue(true);
    prisma.conversationLink.findUnique.mockResolvedValue({
      id: "link-1",
      companyId: "company-1",
      connectionId: "conn-1",
      connectionKey: "env:default",
      whatsappNumber: "5511999999999",
      chatwootConversationId: "conv-1",
      chatwootContactId: "contact-1",
      lastInboundWhatsappNumber: null,
      lastSuccessfulOutboundWhatsappNumber: null,
    });
    prisma.conversationLink.findFirst.mockResolvedValue(null);
    prisma.conversationLink.findMany.mockResolvedValue([]);
    prisma.messageLink.findUnique.mockResolvedValue(null);
    prisma.messageLink.create.mockResolvedValue({});
    evolutionClient.sendTextMessage.mockResolvedValue({
      messageId: "evo-msg-1",
      resolvedWhatsappNumber: "5511999999999",
    });

    service = new ProcessOutgoingMessageUseCase(
      evolutionClient as any,
      chatwootClient as any,
      prisma as any,
      dedupService as any,
      integrationContext as any,
    );
  });

  it("forwards in_reply_to_external_id as quoted reply on outbound text", async () => {
    await service.execute(
      {
        id: "cw-msg-1",
        content: "Resposta vinculada",
        message_type: "outgoing",
        content_attributes: {
          in_reply_to_external_id: "wamid-target-1",
        },
        conversation: {
          id: "conv-1",
        },
      },
      { connection: connection as any },
    );

    expect(evolutionClient.sendTextMessage).toHaveBeenCalledWith(
      connection.evolution,
      "5511999999999",
      "Resposta vinculada",
      "cw-msg-1",
      "wamid-target-1",
    );
    expect(prisma.messageLink.findUnique).not.toHaveBeenCalled();
  });

  it("resolves in_reply_to through messageLink when Chatwoot only sends the internal message id", async () => {
    prisma.messageLink.findUnique.mockResolvedValueOnce({
      evolutionMessageId: "wamid-target-2",
    });

    await service.execute(
      {
        id: "cw-msg-2",
        content: "Resposta por id interno",
        message_type: "outgoing",
        content_attributes: {
          in_reply_to: "cw-parent-9",
        },
        conversation: {
          id: "conv-1",
        },
      },
      { connection: connection as any },
    );

    expect(prisma.messageLink.findUnique).toHaveBeenCalledWith({
      where: {
        connectionKey_chatwootMessageId: {
          connectionKey: "env:default",
          chatwootMessageId: "cw-parent-9",
        },
      },
    });
    expect(evolutionClient.sendTextMessage).toHaveBeenCalledWith(
      connection.evolution,
      "5511999999999",
      "Resposta por id interno",
      "cw-msg-2",
      "wamid-target-2",
    );
  });
});
