import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationConnectionsService } from '../src/modules/settings/integration-connections.service';
import { IntegrationConnectionsRepository } from '../src/modules/settings/integration-connections.repository';
import { IntegrationConnectionsMapperService } from '../src/modules/settings/integration-connections.mapper.service';
import { IntegrationConnectionsValidatorService } from '../src/modules/settings/integration-connections-validator.service';
import { IntegrationConnectionsTesterService } from '../src/modules/settings/integration-connections-tester.service';
import { ensureRequiredEvolutionSubscribe } from '../src/modules/settings/evolution-webhook-subscribe';
import { SettingsIntegrationSecretsService } from '../src/modules/settings/settings-integration-secrets.service';

describe('ensureRequiredEvolutionSubscribe', () => {
  it('keeps ALL untouched when the provider should emit every event', () => {
    expect(ensureRequiredEvolutionSubscribe(['ALL'])).toEqual(['ALL']);
  });

  it('adds the minimum inbound events required by the current bridge', () => {
    expect(ensureRequiredEvolutionSubscribe(['GROUP'])).toEqual(
      expect.arrayContaining(['GROUP', 'MESSAGE', 'READ_RECEIPT', 'QRCODE', 'CONNECTION']),
    );
  });
});

describe('IntegrationConnectionsService', () => {
  const prismaMock = {
    integrationConnection: {
      findUnique: vi.fn(),
    },
  };

  let service: IntegrationConnectionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    const settingsSecrets = new SettingsIntegrationSecretsService();
    vi.spyOn(settingsSecrets, 'decrypt').mockImplementation((value: string) => {
      if (value === 'enc-evo-key') return 'evo-key';
      if (value === 'enc-cw-token') return 'cw-token';
      return value;
    });
    vi.spyOn(settingsSecrets, 'decryptOptional').mockImplementation((value?: string | null) => value ?? null);

    const repository = new IntegrationConnectionsRepository(prismaMock as any);
    const mapper = new IntegrationConnectionsMapperService(settingsSecrets);
    const validator = new IntegrationConnectionsValidatorService(repository);
    const tester = new IntegrationConnectionsTesterService(settingsSecrets);
    service = new IntegrationConnectionsService(repository, mapper, validator, tester);
  });

  it('reapplies the Evolution webhook with required inbound subscriptions during connection tests', async () => {
    prismaMock.integrationConnection.findUnique.mockResolvedValue({
      id: 'connection-1',
      evolutionApiUrl: 'https://evolution.example.com',
      evolutionApiKeyEncrypted: 'enc-evo-key',
      evolutionInstance: 'instance-alpha',
      evolutionInstanceId: 'instance-id-1',
      chatwootUrl: 'https://chatwoot.example.com',
      chatwootApiTokenEncrypted: 'enc-cw-token',
      chatwootAccountId: '42',
      chatwootInboxId: '99',
      chatwootInboxIdentifier: 'whatsapp',
      metadata: {
        evolution: {
          webhookUrl: 'https://api.example.com/api/webhooks/evolution',
          subscribe: ['GROUP'],
          immediate: true,
        },
      },
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 99, identifier: 'whatsapp' }],
        text: async () => '',
      } as any);

    const result = await service.test('connection-1');

    expect(result?.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const connectCall = fetchMock.mock.calls[1];
    expect(connectCall?.[0]).toBe('https://evolution.example.com/instance/connect');

    const connectInit = connectCall?.[1] as any;
    const body = JSON.parse(String(connectInit.body));
    expect(body.subscribe).toEqual(
      expect.arrayContaining(['GROUP', 'MESSAGE', 'READ_RECEIPT', 'QRCODE', 'CONNECTION']),
    );
  });
});
