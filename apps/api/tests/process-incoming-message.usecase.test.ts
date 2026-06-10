import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessIncomingMessageUseCase } from "../src/modules/integrations/messaging/application/process-incoming-message.usecase";

describe("ProcessIncomingMessageUseCase reactions", () => {
  const chatwootClient = {
    createPrivateNote: vi.fn(),
    createIncomingMessage: vi.fn(),
  };

  const prisma = {
    systemSetting: {
      findUnique: vi.fn(),
    },
    messageLink: {
      findUnique: vi.fn(),
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
    prisma.systemSetting.findUnique.mockResolvedValue(null);
    dedupService.claim.mockResolvedValue(true);
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
});
