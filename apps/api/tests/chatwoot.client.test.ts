import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatwootAttachmentResolver } from "../src/modules/integrations/chatwoot/chatwoot-attachment.resolver";
import { ChatwootClient } from "../src/modules/integrations/chatwoot/chatwoot.client";

describe("ChatwootClient media mode", () => {
  let client: ChatwootClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    client = new ChatwootClient(
      new ChatwootAttachmentResolver(),
      {} as any,
    );
  });

  it("uploads inbound images as native attachments when incomingMediaMode is absent", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 123 }),
    } as any);

    await client.createIncomingMessage(
      {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      "contact-1",
      "conv-1",
      "Imagem recebida",
      {
        base64: "AQID",
        mimetype: "image/png",
        filename: "imagem.png",
        publicUrl: "https://cdn.example.com/imagem.png",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://chat.example.com/public/api/v1/inboxes/whatsapp/contacts/contact-1/conversations/conv-1/messages",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });
});
