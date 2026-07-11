import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessIncomingMessageUseCase } from "../src/modules/integrations/messaging/application/process-incoming-message.usecase";

describe("ProcessIncomingMessageUseCase reactions", () => {
  const chatwootClient = {
    createPrivateNote: vi.fn(),
    createIncomingMessage: vi.fn(),
    getConversationDetails: vi.fn(),
    createOrFindContact: vi.fn(),
    getContactableInboxes: vi.fn(),
    listConversations: vi.fn(),
    createConversation: vi.fn(),
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
    prisma.companyContact.findFirst.mockImplementation(async (args: any) => {
      if (args?.where?.status === "ARCHIVED") {
        return null;
      }

      return {
        id: "contact-local-1",
        whatsapp: "5511999999999",
        name: "Cliente Teste",
        status: "ACTIVE",
        companyLinks: [],
      };
    });
    prisma.conversationLink.create.mockResolvedValue({
      id: "link-1",
      whatsappNumber: "5511999999999",
      chatwootConversationId: "conv-new",
      chatwootContactId: "source-123",
      connectionKey: "env:default",
      companyId: null,
      connectionId: null,
      lastInboundWhatsappNumber: "5511999999999",
    });
    prisma.conversationLink.update.mockImplementation(async ({ data, where }: any) => ({
      id: where?.id ?? "link-1",
      whatsappNumber: "5511999999999",
      chatwootConversationId: data?.chatwootConversationId ?? "conv-1",
      chatwootContactId: "source-123",
      connectionKey: "env:default",
      companyId: null,
      connectionId: null,
      lastInboundWhatsappNumber: data?.lastInboundWhatsappNumber ?? "5511999999999",
    }));
    chatwootClient.createOrFindContact.mockResolvedValue({
      payload: {
        contact: {
          id: "42",
          source_id: "source-123",
          contact_inboxes: [
            {
              source_id: "source-123",
              inbox_id: "2",
              inbox: { id: "2", identifier: "whatsapp" },
            },
          ],
        },
      },
    });
    chatwootClient.getContactableInboxes.mockResolvedValue([]);
    chatwootClient.listConversations.mockResolvedValue([]);
    chatwootClient.createConversation.mockResolvedValue({ id: "conv-new" });
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

  it("forwards a single inbound payload object without requiring messages[]", async () => {
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
      {
        key: {
          id: "text-msg-1",
          fromMe: false,
          remoteJid: "5511999999999@s.whatsapp.net",
        },
        pushName: "Cliente Teste",
        message: {
          conversation: "Mensagem avulsa",
        },
      },
      { instanceId: "instance-1", connection: connection as any },
    );

    expect(chatwootClient.createIncomingMessage).toHaveBeenCalledWith(
      connection.chatwoot,
      "contact-1",
      "conv-1",
      "Mensagem avulsa",
      undefined,
    );
  });

  it("accepts sender/chat fields emitted after the LID swap", async () => {
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
      {
        id: "text-msg-2",
        sender: "136601518760181@lid",
        senderAlt: "553492223404@s.whatsapp.net",
        chat: "553492223404@s.whatsapp.net",
        pushName: "Cliente LID",
        message: {
          conversation: "Mensagem com swap",
        },
      },
      { instanceId: "instance-1", connection: connection as any },
    );

    expect(chatwootClient.createIncomingMessage).toHaveBeenCalledWith(
      connection.chatwoot,
      "contact-1",
      "conv-1",
      "Mensagem com swap",
      undefined,
    );
  });

  it("creates a new Chatwoot conversation instead of reusing another active conversation when no local link exists", async () => {
    prisma.conversationLink.findUnique.mockResolvedValueOnce(null);
    chatwootClient.listConversations.mockResolvedValueOnce([
      {
        id: "conv-open-2",
        status: "open",
        inbox_id: "2",
        contact_inbox: { source_id: "source-123" },
        meta: { sender: { phone_number: "+55 11 99999-9999" } },
      },
    ]);

    const connection = {
      connectionKey: "env:default",
      connectionId: "conn-1",
      companyId: null,
      chatwoot: {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      evolution: {},
    };

    const result = await service["resolveOrCreateConversationLink"](
      "5511999999999",
      "Cliente Teste",
      connection as any,
      { csatPendingTimeoutHours: 24 } as any,
      { interactionKind: "message", messageId: "msg-1", textContent: "Oi" },
    );

    expect(result).toEqual({
      contactIdentifier: "source-123",
      conversationId: "conv-new",
    });
    expect(chatwootClient.createConversation).toHaveBeenCalledWith(
      connection.chatwoot,
      "source-123",
      "42",
    );
    expect(chatwootClient.listConversations).not.toHaveBeenCalled();
    expect(prisma.conversationLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chatwootConversationId: "conv-new",
          chatwootContactId: "source-123",
        }),
      }),
    );
  });

  it("creates a new Chatwoot conversation when the linked conversation is already resolved", async () => {
    chatwootClient.getConversationDetails.mockResolvedValueOnce({
      id: "conv-resolved-1",
      status: "resolved",
      custom_attributes: {},
    });
    chatwootClient.listConversations.mockResolvedValueOnce([
      {
        id: "conv-open-3",
        status: "open",
        inbox_id: "2",
        contact_inbox: { source_id: "source-123" },
        meta: { sender: { phone_number: "+55 11 99999-9999" } },
      },
    ]);

    const link = await service["applyResolvedConversationReusePolicy"](
      {
        id: "link-1",
        chatwootConversationId: "conv-resolved-1",
        chatwootContactId: "source-123",
      },
      {
        connectionKey: "env:default",
        chatwoot: {
          url: "https://chat.example.com",
          apiToken: "token",
          accountId: "1",
          inboxId: "2",
          inboxIdentifier: "whatsapp",
        },
      } as any,
      "5511999999999",
      { csatPendingTimeoutHours: 24 } as any,
      { interactionKind: "message", messageId: "msg-2", textContent: "Nova mensagem" },
    );

    expect(link.chatwootConversationId).toBe("conv-new");
    expect(chatwootClient.createConversation).toHaveBeenCalledWith(
      {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      "source-123",
    );
    expect(chatwootClient.listConversations).not.toHaveBeenCalled();
    expect(prisma.conversationLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "link-1" },
        data: expect.objectContaining({
          chatwootConversationId: "conv-new",
        }),
      }),
    );
  });
});
