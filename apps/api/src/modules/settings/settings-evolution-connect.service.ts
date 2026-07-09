import { Injectable } from '@nestjs/common';
import { SettingsEvolutionStatusStoreService } from './settings-evolution-status-store.service';
import { buildEvolutionConnectConfig, type EvolutionConnectConfigSource } from './evolution-connect-config';

type ConnectInstanceInput = EvolutionConnectConfigSource & {
  apiUrl: string;
  apiKey: string;
  instance: string;
  instanceId?: string;
};

type ConnectInstanceResult = {
  ok: boolean;
  endpoint?: string;
  qrCode?: string | null;
  code?: string | null;
  receivedAt?: string | null;
  error?: string;
};

@Injectable()
export class SettingsEvolutionConnectService {
  constructor(
    private readonly evolutionStatusStore: SettingsEvolutionStatusStoreService,
  ) {}

  async connectInstance(input: ConnectInstanceInput): Promise<ConnectInstanceResult> {
    const base = input.apiUrl.replace(/\/+$/, '');
    const instanceId = input.instanceId?.trim();
    const endpoint = '/instance/connect';
    const requestedAt = new Date();

    if (!instanceId) {
      return { ok: false, endpoint, error: 'Instance ID obrigatorio para POST /instance/connect na Evolution Go.' };
    }

    const connectConfig = buildEvolutionConnectConfig(input);
    if (!connectConfig) {
      return { ok: false, endpoint, error: 'Webhook URL obrigatoria para conectar a instancia Evolution Go.' };
    }
    const connectRes = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        apikey: input.apiKey,
        'Content-Type': 'application/json',
        instanceId,
      },
      body: JSON.stringify(connectConfig),
    }).catch((error: any) => ({
      ok: false,
      status: 0,
      json: async () => ({}),
      text: async () => error?.message ?? 'network_error',
    }) as Response);

    if (!connectRes.ok) {
      const body = await connectRes.text().catch(() => 'unknown_error');
      return { ok: false, endpoint, error: `${endpoint}=status ${connectRes.status} ${body}` };
    }

    await this.evolutionStatusStore.upsertStoredStatus({
      instanceId,
      event: 'connect_requested',
      status: 'CONNECT_REQUESTED',
      details: {
        webhookUrl: connectConfig.webhookUrl,
        subscribe: connectConfig.subscribe,
        hasPhone: Boolean(connectConfig.phone),
        rabbitmqEnable: connectConfig.rabbitmqEnable ?? 'default',
        websocketEnable: connectConfig.websocketEnable ?? 'default',
        natsEnable: connectConfig.natsEnable ?? 'default',
      },
    });

    const connectPayload: any = await connectRes.json().catch(() => ({}));
    const responseQrCode = this.normalizeQrCodeResponse(connectPayload);
    if (responseQrCode.qrCode || responseQrCode.code) {
      return { ok: true, endpoint, ...responseQrCode };
    }

    const storedQrCode = await this.evolutionStatusStore.waitForStoredQrCode(instanceId, requestedAt);
    return { ok: true, endpoint, ...storedQrCode };
  }

  private normalizeQrCodeResponse(payload: any): {
    qrCode?: string | null;
    code?: string | null;
    receivedAt?: string | null;
  } {
    const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    const qrCode =
      this.readOptionalString(source?.qrCode) ??
      this.readOptionalString(source?.qrcode) ??
      this.readOptionalString(source?.Qrcode) ??
      this.readOptionalString(source?.QRCode) ??
      this.readOptionalString(source?.base64) ??
      this.readOptionalString(payload?.qrCode) ??
      this.readOptionalString(payload?.qrcode);
    const code =
      this.readOptionalString(source?.code) ??
      this.readOptionalString(source?.Code) ??
      this.readOptionalString(payload?.code);
    const receivedAt =
      this.readOptionalString(source?.receivedAt) ??
      this.readOptionalString(payload?.receivedAt);

    return {
      qrCode,
      code,
      receivedAt,
    };
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
