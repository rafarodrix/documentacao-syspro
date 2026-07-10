import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatwootAttachmentResolver } from "../src/modules/integrations/chatwoot/chatwoot-attachment.resolver";

describe("ChatwootAttachmentResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("prefers the original download URL over thumb_url for outbound media", async () => {
    const resolver = new ChatwootAttachmentResolver();
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    } as any);

    const result = await resolver.resolveAttachmentPayload(
      {
        url: "https://chat.example.com",
        apiToken: "token",
        accountId: "1",
        inboxId: "2",
        inboxIdentifier: "whatsapp",
      },
      {
        file_type: "image",
        data: {
          filename: "evidencia",
          download_url: "/rails/active_storage/blobs/original.png",
          thumb_url: "/rails/active_storage/representations/thumb.png",
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://chat.example.com/rails/active_storage/blobs/original.png",
      expect.objectContaining({
        method: "GET",
        headers: { api_access_token: "token" },
      }),
    );
    expect(result).toEqual({
      dataUrl: "data:image/png;base64,AQID",
      mimetype: "image/png",
      filename: "evidencia.png",
    });
  });
});
