import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessIncomingMessageUseCase } from "../src/modules/integrations/messaging/application/process-incoming-message.usecase";

describe("ProcessIncomingMessageUseCase reactions", () => {
  const chatwootClient = {
    createPrivateNote: vi.fn(),
    createIncomingMessage: vi.fn(),
    getConversationDetails: vi.fn(),
  };

  const prisma = {
    systemSetting: {
      findUnique: vi.fn(),
    },
    messageLink: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    conversationLink: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    companyContact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  const evolutionClient = {} as any;
  const r2Storage = {
    isEnabled: vi.fn(() => false),
  };
  const dedupService = {
    claim: vi.fn(),
    release: vi.fn(),
  };
  const integrationContext = {
    getDefaultContext: vi.fn(),
  };

  let service: ProcessIncomingMessageUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    prisma.systemSetting.findUnique.mockResolvedValue(null);
    dedupService.claim.mockResolvedValue(true);
    chatwootClient.getConversationDetails.mockResolvedValue({
      messages: [{ id: 999 }],
    });
    prisma.conversationLink.findUnique.mockResolvedValue({
      whatsappNumber: "5511999999999",
      chatwootConversationId: "conv-1",
      chatwootContactId: "contact-1",
      connectionKey: "env:default",
      companyId: null,
      connectionId: null,
    });
    prisma.conversationLink.findFirst.mockResolvedValue({
      whatsappNumber: "5511999999999",
      chatwootConversationId: "conv-1",
      chatwootContactId: "contact-1",
      connectionKey: "env:default",
      companyId: null,
      connectionId: null,
    });
    prisma.conversationLink.findMany.mockResolvedValue([]);
    prisma.companyContact.findFirst.mockResolvedValue({
      id: "contact-local-1",
      whatsapp: "5511999999999",
      name: "Cliente Teste",
      status: "ACTIVE",
      companyLinks: [],
    });
    service = new ProcessIncomingMessageUseCase(
      chatwootClient as any,
      prisma as any,
      evolutionClient,
      r2Storage as any,
      dedupService as any,
      integrationContext as any,
    );
  });

  it("forwards inbound emoji reactions as Chatwoot private notes on the linked conversation", async () => {
    prisma.messageLink.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        chatwootConversationId: "conv-1",
        chatwootMessageId: "cw-msg-10",
        evolutionMessageId: "wamid-target",
        connectionKey: "env:default",
      });

    const connection = {
      connectionKey: "env:default",
      chatwoot: {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      evolution: {},
    };

    await service.execute(
      [{
        key: {
          id: "reaction-msg-1",
          fromMe: false,
          remoteJid: "5511999999999@s.whatsapp.net",
        },
        pushName: "Cliente Teste",
        message: {
          reactionMessage: {
            text: "👍",
            key: {
              id: "wamid-target",
            },
          },
        },
      }],
      { instanceId: "instance-1", connection: connection as any },
    );

    expect(chatwootClient.createPrivateNote).toHaveBeenCalledWith(
      connection.chatwoot,
      "conv-1",
      expect.stringContaining("reagiu no WhatsApp com 👍."),
    );
    expect(chatwootClient.createIncomingMessage).not.toHaveBeenCalled();
  });

  it("falls back to text when a sticker arrives without binary payload", async () => {
    const connection = {
      connectionKey: "env:default",
      chatwoot: {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      evolution: {
        allowedGroupJids: [],
        allowedGroups: [],
      },
    };

    await service.execute(
      [{
        key: {
          id: "sticker-msg-1",
          fromMe: false,
          remoteJid: "5511999999999@s.whatsapp.net",
        },
        pushName: "Cliente Teste",
        message: {
          stickerMessage: {
            mimetype: "image/webp",
          },
        },
      }],
      { instanceId: "instance-1", connection: connection as any },
    );

    expect(chatwootClient.createIncomingMessage).toHaveBeenCalledWith(
      connection.chatwoot,
      "contact-1",
      "conv-1",
      "Cliente enviou uma figurinha no WhatsApp.",
      undefined,
    );
  });

  it("downloads sticker media from mediaUrl when Evolution Go sends file URLs instead of base64", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "image/webp" }),
      arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
    } as any);

    const connection = {
      connectionKey: "env:default",
      chatwoot: {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      evolution: {
        allowedGroupJids: [],
        allowedGroups: [],
      },
    };

    await service.execute(
      [{
        key: {
          id: "sticker-msg-2",
          fromMe: false,
          remoteJid: "5511999999999@s.whatsapp.net",
        },
        pushName: "Cliente Teste",
        message: {
          mediaUrl: "https://files.example.com/sticker.webp",
          stickerMessage: {
            mimetype: "image/webp",
          },
        },
      }],
      { instanceId: "instance-1", connection: connection as any },
    );

    expect(chatwootClient.createIncomingMessage).toHaveBeenCalledWith(
      connection.chatwoot,
      "contact-1",
      "conv-1",
      "",
      expect.objectContaining({
        mimetype: "image/webp",
        filename: "figurinha.webp",
      }),
    );
  });
});
