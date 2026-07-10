import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatwootWebhookController } from "../src/modules/integrations/chatwoot/chatwoot-webhook.controller";

describe("ChatwootWebhookController message deletion", () => {
  const processOutgoingMessage = {
    execute: vi.fn(),
  };

  const prisma = {
    messageLink: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    conversationLink: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    companyContact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const integrationContext = {
    resolveForChatwootWebhook: vi.fn(),
    resolveByConnectionKey: vi.fn(),
  };

  const chatwootClient = {
    getConversationDetails: vi.fn(),
  };

  const evolutionClient = {
    deleteMessageForEveryone: vi.fn(),
  };

  const settingsService = {
    readBehaviorSettings: vi.fn(),
  };

  const behaviorService = {
    applyMessageBehaviorRules: vi.fn(),
    resolveConversationCustomAttributes: vi.fn(),
  };

  const csatService = {
    handleCsatReplyIfApplicable: vi.fn(),
    forceResolveConversationAfterCsatReply: vi.fn(),
    clearCsatSkipMarkersOnConversationOpen: vi.fn(),
    applyCancellationLabelClosurePolicy: vi.fn(),
    triggerCsatSurveyForResolvedConversation: vi.fn(),
  };

  const resolvedContext = {
    connectionKey: "conn-1",
    connectionId: "conn-1",
    companyId: "company-1",
    name: "Connection 1",
    chatwoot: {
      url: "https://chat.example.com",
      apiToken: "token",
      accountId: "1",
      inboxId: "2",
      inboxIdentifier: "whatsapp",
      webhookMaxSkewSeconds: 300,
    },
    evolution: {
      apiUrl: "https://evolution.example.com",
      apiKey: "key",
      instance: "instance-1",
      instanceId: "instance-1",
    },
  };

  let controller: ChatwootWebhookController;

  beforeEach(() => {
    vi.clearAllMocks();

    prisma.messageLink.findUnique.mockResolvedValue({
      connectionKey: "conn-1",
      chatwootConversationId: "conv-1",
      evolutionMessageId: "evo-msg-1",
    });
    prisma.messageLink.findFirst.mockResolvedValue(null);
    prisma.messageLink.deleteMany.mockResolvedValue({ count: 1 });
    prisma.conversationLink.findFirst.mockResolvedValue(null);
    chatwootClient.getConversationDetails.mockResolvedValue({
      meta: {
        sender: {
          phone_number: "+55 11 99999-9999",
        },
      },
    });
    evolutionClient.deleteMessageForEveryone.mockResolvedValue(undefined);

    controller = new ChatwootWebhookController(
      processOutgoingMessage as any,
      prisma as any,
      integrationContext as any,
      chatwootClient as any,
      evolutionClient as any,
      settingsService as any,
      behaviorService as any,
      csatService as any,
    );
  });

  it("falls back to Chatwoot conversation details when the conversation link was already released", async () => {
    await controller["handleMessageDeleted"](
      {
        event: "message_deleted",
        message: {
          id: "cw-msg-1",
        },
      },
      resolvedContext as any,
    );

    expect(chatwootClient.getConversationDetails).toHaveBeenCalledWith(
      resolvedContext.chatwoot,
      "conv-1",
    );
    expect(evolutionClient.deleteMessageForEveryone).toHaveBeenCalledWith(
      resolvedContext.evolution,
      {
        messageId: "evo-msg-1",
        remoteJid: "5511999999999",
        fromMe: true,
      },
    );
    expect(prisma.messageLink.deleteMany).toHaveBeenCalledWith({
      where: {
        connectionKey: "conn-1",
        chatwootMessageId: "cw-msg-1",
      },
    });
  });
});
