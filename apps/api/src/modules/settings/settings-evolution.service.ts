import { Injectable } from '@nestjs/common';
import { readEvolutionRuntimeConfig } from '@dosc-syspro/config';
import { type EvolutionSettingsInput } from '@dosc-syspro/contracts/evolution';
import { IntegrationContextService } from './integration-context.service';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { SettingsEvolutionConfigService } from './settings-evolution-config.service';
import { SettingsEvolutionStatusStoreService } from './settings-evolution-status-store.service';
import { SettingsEvolutionConnectService } from './settings-evolution-connect.service';

@Injectable()
export class SettingsEvolutionService {
  constructor(
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
    private readonly evolutionConfig: SettingsEvolutionConfigService,
    private readonly evolutionStatusStore: SettingsEvolutionStatusStoreService,
    private readonly evolutionConnect: SettingsEvolutionConnectService,
  ) {}

  async getSettings() {
    return { success: true, settings: await this.evolutionConfig.readStoredSettings() };
  }

  async setSettings(input: EvolutionSettingsInput) {
    const result = await this.evolutionConfig.upsertSettings(input);

    return {
      success: true,
      settings: result.settings,
      updatedAt: result.updatedAt,
    };
  }

  async getInstanceStatus() {
    const [context, settings] = await Promise.all([
      this.integrationContext.getDefaultContext(),
      this.evolutionConfig.readStoredSettings(),
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

    const stored = await this.evolutionStatusStore.readStoredStatus(instanceId);
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
      this.evolutionConfig.readStoredSettings(),
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

    const result = await this.evolutionConnect.connectInstance({
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
      this.evolutionConfig.readStoredSettings(),
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
}
