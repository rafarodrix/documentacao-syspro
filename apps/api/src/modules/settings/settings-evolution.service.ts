import { Injectable } from '@nestjs/common';
import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import {
  DEFAULT_EVOLUTION_SETTINGS,
  evolutionSettingsSchema,
  type EvolutionSettingsInput,
} from '@dosc-syspro/contracts/evolution';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationContextService } from './integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { ensureRequiredEvolutionSubscribe } from './evolution-webhook-subscribe';

@Injectable()
export class SettingsEvolutionService {
  private static readonly EVOLUTION_CONFIG_KEY = 'evolution_config';
  private static readonly EVOLUTION_QRCODE_KEY_PREFIX = 'evolution_qrcode:';
  private static readonly EVOLUTION_STATUS_KEY_PREFIX = 'evolution_status:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  async getSettings() {
    return { success: true, settings: await this.readStoredSettings() };
  }

  async setSettings(input: EvolutionSettingsInput) {
    const parsed = evolutionSettingsSchema.parse(input);
    const setting = await this.prisma.systemSetting.upsert({
      where: { key: SettingsEvolutionService.EVOLUTION_CONFIG_KEY },
      update: { value: JSON.stringify(parsed) },
      create: {
        key: SettingsEvolutionService.EVOLUTION_CONFIG_KEY,
        value: JSON.stringify(parsed),
        description: 'Configuracao global Evolution',
      },
    });

    return {
      success: true,
      settings: parsed,
      updatedAt: setting.updatedAt,
    };
  }

  async getInstanceStatus() {
    const [context, settings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.readStoredSettings(),
    ]);
    const instanceId = String(context?.evolution.instanceId || settings.instanceId || '').trim();
    const instance = String(context?.evolution.instance || settings.instance || '').trim();

    if (!instanceId) {
      return {
        success: true,
        data: {
          configured: false,
          instance,
          instanceId: null,
          status: 'NOT_CONFIGURED',
          event: null,
          receivedAt: null,
          details: {},
        },
      };
    }

    const stored = await this.readStoredStatus(instanceId);
    return {
      success: true,
      data: {
        configured: Boolean(context?.evolution.apiUrl && context?.evolution.apiKey && instanceId),
        instance,
        instanceId,
        status: stored?.status ?? 'UNKNOWN',
        event: stored?.event ?? null,
        receivedAt: stored?.receivedAt ?? null,
        details: stored?.details ?? {},
      },
    };
  }

  async getQrCode() {
    const [context, settings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.readStoredSettings(),
    ]);

    if (!context?.evolution?.apiUrl || !context?.evolution?.apiKey) {
      return {
        success: false,
        error: 'EVOLUTION_CONTEXT_NOT_CONFIGURED',
        message: 'Evolution API URL ou API key nao configurada no contexto efetivo.',
      };
    }

    const instance = String(context.evolution.instance || settings.instance || '').trim();
    if (!instance) {
      return {
        success: false,
        error: 'EVOLUTION_INSTANCE_NOT_CONFIGURED',
        message: 'Instancia Evolution nao configurada.',
      };
    }

    const result = await this.connectInstance({
      apiUrl: context.evolution.apiUrl,
      apiKey: context.evolution.apiKey,
      instance,
      instanceId: context.evolution.instanceId || settings.instanceId || '',
      phone: settings.phone,
      webhookUrl: settings.webhookUrl,
      subscribe: settings.subscribe,
      immediate: settings.immediate,
    });

    return {
      success: result.ok,
      data: result.ok
        ? {
            instance,
            endpoint: result.endpoint,
            qrCode: result.qrCode,
            code: result.code,
            receivedAt: result.receivedAt,
          }
        : undefined,
      error: result.ok ? undefined : 'EVOLUTION_QRCODE_FAILED',
      message: result.ok
        ? result.qrCode
          ? 'QR Code recebido pelo webhook da Evolution.'
          : 'Conexao aplicada na Evolution; aguardando evento QRCode no webhook.'
        : result.error,
    };
  }

  async getDiagnostics() {
    const [defaultContext, activeContexts, storedSettings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.integrationContext.listActiveContexts(),
      this.readStoredSettings(),
    ]);

    const runtime = readEvolutionRuntimeConfig();
    const chatwootDiagnostics = defaultContext
      ? await this.chatwootClient.inspectInboxConfiguration(defaultContext.chatwoot)
      : null;
    const issues: string[] = [];

    if (!defaultContext) issues.push('Nenhum contexto de integracao ativo foi resolvido.');
    if (defaultContext?.source === 'env') issues.push('O backend esta usando o fallback de ambiente `env:default`.');
    if (!defaultContext?.evolution.apiUrl?.trim()) issues.push('Evolution API URL ausente no contexto efetivo.');
    if (!defaultContext?.evolution.apiKey?.trim()) issues.push('Evolution API key ausente no contexto efetivo.');
    if (!defaultContext?.evolution.instance?.trim()) issues.push('Evolution instance ausente no contexto efetivo.');
    if (!runtime.apiUrl?.trim()) issues.push('EVOLUTION_API_URL ausente no runtime do backend.');
    if (!runtime.apiKey?.trim()) issues.push('EVOLUTION_API_KEY ausente no runtime do backend.');
    if (!String(runtime.instance ?? '').trim() && !String(storedSettings.instance ?? '').trim()) {
      issues.push('Nenhuma instance foi encontrada nem nas variaveis de ambiente nem em `evolution_config`.');
    }

    return {
      success: true,
      data: {
        resolvedDefaultContext: defaultContext
          ? {
              source: defaultContext.source,
              connectionKey: defaultContext.connectionKey,
              connectionId: defaultContext.connectionId,
              companyId: defaultContext.companyId,
              name: defaultContext.name,
              evolution: {
                apiUrl: defaultContext.evolution.apiUrl || null,
                hasApiKey: Boolean(defaultContext.evolution.apiKey),
                instance: defaultContext.evolution.instance || null,
                instanceId: defaultContext.evolution.instanceId || null,
                hasInstanceToken: Boolean(defaultContext.evolution.instanceToken),
              },
            }
          : null,
        runtime: {
          apiUrl: runtime.apiUrl || null,
          hasApiKey: Boolean(runtime.apiKey),
          instance: String(runtime.instance ?? '').trim() || null,
        },
        storedSettings: {
          instance: String(storedSettings.instance ?? '').trim() || null,
          instanceId: String(storedSettings.instanceId ?? '').trim() || null,
          hasInstanceToken: Boolean(storedSettings.instanceToken),
        },
        activeConnections: activeContexts.map((context) => ({
          source: context.source,
          connectionKey: context.connectionKey,
          connectionId: context.connectionId,
          companyId: context.companyId,
          name: context.name,
          evolution: {
            apiUrl: context.evolution.apiUrl || null,
            hasApiKey: Boolean(context.evolution.apiKey),
            instance: context.evolution.instance || null,
            instanceId: context.evolution.instanceId || null,
          },
          chatwoot: {
            accountId: context.chatwoot.accountId || null,
            inboxId: context.chatwoot.inboxId || null,
            inboxIdentifier: context.chatwoot.inboxIdentifier || null,
          },
        })),
        chatwootDiagnostics,
        issues,
      },
    };
  }

  private async readStoredSettings() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: SettingsEvolutionService.EVOLUTION_CONFIG_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return DEFAULT_EVOLUTION_SETTINGS;
    }

    try {
      const parsed = JSON.parse(setting.value);
      const validation = evolutionSettingsSchema.safeParse(parsed);
      return validation.success ? validation.data : DEFAULT_EVOLUTION_SETTINGS;
    } catch {
      return DEFAULT_EVOLUTION_SETTINGS;
    }
  }

  private async connectInstance(input: {
    apiUrl: string;
    apiKey: string;
    instance: string;
    instanceId?: string;
    phone?: string;
    webhookUrl?: string;
    subscribe?: string[];
    immediate?: boolean;
  }): Promise<{
    ok: boolean;
    endpoint?: string;
    qrCode?: string | null;
    code?: string | null;
    receivedAt?: string | null;
    error?: string;
  }> {
    const base = input.apiUrl.replace(/\/+$/, '');
    const instanceId = input.instanceId?.trim();
    const webhookUrl = input.webhookUrl?.trim();
    const endpoint = '/instance/connect';
    const requestedAt = new Date();

    if (!instanceId) {
      return { ok: false, endpoint, error: 'Instance ID obrigatorio para POST /instance/connect na Evolution Go.' };
    }

    if (!webhookUrl) {
      return { ok: false, endpoint, error: 'Webhook URL obrigatoria para conectar a instancia Evolution Go.' };
    }

    const subscribe = ensureRequiredEvolutionSubscribe(input.subscribe);
    const connectRes = await fetch(`${base}${endpoint}`, {
      method: 'POST',
      headers: {
        apikey: input.apiKey,
        'Content-Type': 'application/json',
        instanceId,
      },
      body: JSON.stringify({
        webhookUrl,
        subscribe,
        immediate: input.immediate !== false,
        ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      }),
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

    await this.upsertStoredStatus({
      instanceId,
      event: 'connect_requested',
      status: 'CONNECT_REQUESTED',
      details: {
        webhookUrl,
        subscribe,
        hasPhone: Boolean(input.phone?.trim()),
      },
    });

    const connectPayload: any = await connectRes.json().catch(() => ({}));
    const responseQrCode = this.normalizeQrCodeResponse(connectPayload);
    if (responseQrCode.qrCode || responseQrCode.code) {
      return { ok: true, endpoint, ...responseQrCode };
    }

    const storedQrCode = await this.waitForStoredQrCode(instanceId, requestedAt);
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

  private async waitForStoredQrCode(instanceId: string, minReceivedAt: Date) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const stored = await this.readStoredQrCode(instanceId, minReceivedAt);
      if (stored?.qrCode || stored?.code) return stored;
      await this.sleep(750);
    }

    return { qrCode: null, code: null, receivedAt: null };
  }

  private async readStoredQrCode(instanceId: string, minReceivedAt: Date) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsEvolutionService.EVOLUTION_QRCODE_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      const receivedAt = this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString();
      if (new Date(receivedAt).getTime() < minReceivedAt.getTime()) {
        return null;
      }

      return {
        qrCode: this.readOptionalString(parsed?.qrCode),
        code: this.readOptionalString(parsed?.code),
        receivedAt,
      };
    } catch {
      return null;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async upsertStoredStatus(input: {
    instanceId: string;
    event: string;
    status: string;
    details?: Record<string, unknown>;
  }) {
    const payload = {
      instanceId: input.instanceId,
      event: input.event,
      status: input.status,
      details: input.details ?? {},
      receivedAt: new Date().toISOString(),
    };

    await this.prisma.systemSetting.upsert({
      where: { key: `${SettingsEvolutionService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}` },
      update: { value: JSON.stringify(payload) },
      create: {
        key: `${SettingsEvolutionService.EVOLUTION_STATUS_KEY_PREFIX}${input.instanceId}`,
        value: JSON.stringify(payload),
        description: 'Ultimo status operacional recebido da Evolution Go',
      },
    });
  }

  private async readStoredStatus(instanceId: string) {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: `${SettingsEvolutionService.EVOLUTION_STATUS_KEY_PREFIX}${instanceId}` },
      select: { value: true, updatedAt: true },
    });

    if (!row?.value) return null;

    try {
      const parsed = JSON.parse(row.value);
      return {
        status: this.readOptionalString(parsed?.status) ?? 'UNKNOWN',
        event: this.readOptionalString(parsed?.event),
        receivedAt: this.readOptionalString(parsed?.receivedAt) ?? row.updatedAt.toISOString(),
        details: parsed?.details && typeof parsed.details === 'object' ? parsed.details : {},
      };
    } catch {
      return null;
    }
  }

  private readOptionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
