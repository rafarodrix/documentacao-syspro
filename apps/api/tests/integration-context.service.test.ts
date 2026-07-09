import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationContextService } from "../src/modules/settings/integration-context.service";
import { IntegrationContextMapperService } from "../src/modules/settings/integration-context-mapper.service";
import { SettingsIntegrationSecretsService } from "../src/modules/settings/settings-integration-secrets.service";

describe("IntegrationContextService", () => {
  const repository = {
    listActive: vi.fn(),
  };

  const chatwootConfigStore = {
    readStoredIntegrationSettings: vi.fn(),
  };

  const evolutionConfig = {
    readStoredSettings: vi.fn(),
  };

  let service: IntegrationContextService;

  beforeEach(() => {
    vi.clearAllMocks();

    const settingsSecrets = new SettingsIntegrationSecretsService();
    vi.spyOn(settingsSecrets, "decrypt").mockImplementation((value: string) => value);
    vi.spyOn(settingsSecrets, "decryptOptional").mockImplementation((value?: string | null) => value ?? null);

    chatwootConfigStore.readStoredIntegrationSettings.mockResolvedValue({
      url: "",
      accountId: "",
      apiToken: "",
      platformApiToken: "",
      inboxId: "",
      inboxIdentifier: "",
      webhookSecret: "",
      webhookMaxSkewSeconds: 300,
      systemBotApiToken: "",
      isStored: false,
    });
    evolutionConfig.readStoredSettings.mockResolvedValue({
      apiUrl: "",
      apiKey: "",
      enabled: false,
      instance: "",
      instanceId: "",
      instanceToken: "",
      webhookBaseUrl: "",
      webhookPath: "/api/webhooks/evolution",
      webhookUrl: "",
      allowedGroupJids: [],
      allowedGroups: [],
    });

    service = new IntegrationContextService(
      repository as any,
      new IntegrationContextMapperService(settingsSecrets),
      chatwootConfigStore as any,
      evolutionConfig as any,
    );
  });

  it("does not treat sender as the Evolution instance id when resolving inbound webhooks", async () => {
    repository.listActive
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "connection-1",
          companyId: null,
          name: "Principal",
          evolutionApiUrl: "https://evolution.example.com",
          evolutionApiKeyEncrypted: "evo-key",
          evolutionInstance: "instance-alpha",
          evolutionInstanceId: "instance-id-1",
          evolutionWebhookSecretEncrypted: null,
          chatwootUrl: "https://chatwoot.example.com",
          chatwootApiTokenEncrypted: "cw-token",
          chatwootAccountId: "42",
          chatwootInboxId: "99",
          chatwootInboxIdentifier: "whatsapp",
          chatwootWebhookSecretEncrypted: null,
          metadata: {},
        },
      ]);

    const resolved = await service.resolveForEvolutionWebhook({
      sender: "553492223404@s.whatsapp.net",
      chat: "553492223404@s.whatsapp.net",
      event: "Message",
    });

    expect(repository.listActive.mock.calls[0]?.[0]?.orFilters).toEqual([]);
    expect(resolved?.connectionKey).toBe("connection-1");
  });
});
