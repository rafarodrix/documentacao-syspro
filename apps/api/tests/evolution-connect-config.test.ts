import { describe, expect, it } from 'vitest';
import {
  buildEvolutionConnectConfig,
  readEvolutionConnectConfigSource,
} from '../src/modules/settings/evolution-connect-config';

describe('evolution-connect-config', () => {
  it('builds the connect payload with required subscriptions and enabled auxiliary channels', () => {
    expect(
      buildEvolutionConnectConfig({
        webhookUrl: 'https://backend.example.com/api/webhooks/evolution',
        subscribe: ['GROUP'],
        immediate: true,
        phone: '5534999999999',
        rabbitmqEnable: 'enabled',
        websocketEnable: 'default',
        natsEnable: true,
      }),
    ).toEqual({
      webhookUrl: 'https://backend.example.com/api/webhooks/evolution',
      subscribe: expect.arrayContaining(['GROUP', 'MESSAGE', 'READ_RECEIPT', 'QRCODE', 'CONNECTION']),
      immediate: true,
      phone: '5534999999999',
      rabbitmqEnable: 'enabled',
      natsEnable: 'enabled',
    });
  });

  it('reads nested Evolution metadata before building the connect payload', () => {
    const source = readEvolutionConnectConfigSource({
      evolution: {
        webhookUrl: 'https://backend.example.com/api/webhooks/evolution',
        subscribe: ['MESSAGE'],
        websocketEnable: 'enabled',
      },
    });

    expect(buildEvolutionConnectConfig(source)).toEqual({
      webhookUrl: 'https://backend.example.com/api/webhooks/evolution',
      subscribe: expect.arrayContaining(['MESSAGE', 'READ_RECEIPT', 'QRCODE', 'CONNECTION']),
      immediate: true,
      websocketEnable: 'enabled',
    });
  });

  it('returns null when webhookUrl is missing', () => {
    expect(buildEvolutionConnectConfig({ subscribe: ['MESSAGE'] })).toBeNull();
  });
});
