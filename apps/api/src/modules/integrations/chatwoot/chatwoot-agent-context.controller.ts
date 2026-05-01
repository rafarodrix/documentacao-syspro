import { BadRequestException, Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { assertInternalApiKey } from '../../../common/auth/internal-api-auth';
import { IntegrationContextService } from '../../settings/integration-context.service';
import { ChatwootClient, ChatwootConnectionConfig } from './chatwoot.client';

type SyncAgentConversationContextInput = {
  conversationId?: string;
  context?: {
    companyId?: string;
    companyDisplayName?: string;
    hostId?: string;
    hostAlias?: string;
    rustdeskId?: string;
    remoteStatus?: string;
    remoteStatusText?: string;
    conversationTags?: string[];
    machineName?: string;
    deviceId?: string;
    hostname?: string;
    os?: string;
    localUsername?: string;
    agentVersion?: string;
    agentEnvironment?: string;
  };
};

@Controller('integrations/chatwoot/agent-context')
export class ChatwootAgentContextController {
  private readonly logger = new Logger(ChatwootAgentContextController.name);

  constructor(
    private readonly integrationContext: IntegrationContextService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  @Post('sync')
  async sync(
    @Headers('x-internal-api-key') internalApiKey: string | undefined,
    @Body() body: SyncAgentConversationContextInput,
  ) {
    assertInternalApiKey(internalApiKey);

    const conversationId = String(body?.conversationId ?? '').trim();
    if (!conversationId) {
      throw new BadRequestException('Campo "conversationId" obrigatorio.');
    }

    const context = body?.context && typeof body.context === 'object' ? body.context : {};
    const companyScopedContext = context.companyId
      ? (await this.integrationContext.listActiveContexts({ companyIds: [context.companyId] }))[0] ?? null
      : null;
    const resolved = companyScopedContext ?? (await this.integrationContext.getDefaultContext());

    if (!resolved) {
      throw new BadRequestException('Nenhuma conexao Chatwoot ativa encontrada.');
    }
    const systemBotApiToken = await this.integrationContext.getChatwootSystemBotApiToken();
    const chatwootConfig = systemBotApiToken
      ? {
          ...resolved.chatwoot,
          apiToken: systemBotApiToken,
          systemBotApiToken,
        }
      : resolved.chatwoot;

    const customAttributes = this.buildAgentCustomAttributes(context);
    const requestedTags = Array.isArray(context.conversationTags)
      ? Array.from(new Set(context.conversationTags.map((item) => String(item ?? '').trim()).filter(Boolean)))
      : [];

    const technicalNote = this.buildTechnicalNote(customAttributes);

    await this.chatwootClient.updateConversationCustomAttributes(chatwootConfig, conversationId, customAttributes);
    await this.trySyncContactCustomAttributes(chatwootConfig, conversationId, customAttributes);

    if (technicalNote) {
      await this.chatwootClient.createPrivateNote(chatwootConfig, conversationId, technicalNote);
    }

    if (requestedTags.length) {
      const existingTags = await this.chatwootClient.listConversationLabels(chatwootConfig, conversationId);
      const mergedTags = Array.from(new Set([...existingTags, ...requestedTags]));
      await this.chatwootClient.setConversationLabels(chatwootConfig, conversationId, mergedTags);
    }

    return {
      success: true,
      data: {
        conversationId,
        connectionKey: resolved.connectionKey,
        companyId: resolved.companyId ?? customAttributes.company_id ?? null,
      },
    };
  }

  private buildAgentCustomAttributes(context: NonNullable<SyncAgentConversationContextInput['context']>) {
    return {
      agent_source: 'desktop_agent',
      company_id: this.clean(context.companyId),
      company_name: this.clean(context.companyDisplayName),
      host_id: this.clean(context.hostId),
      host_alias: this.clean(context.hostAlias),
      rustdesk_id: this.clean(context.rustdeskId),
      remote_status: this.clean(context.remoteStatus),
      remote_status_text: this.clean(context.remoteStatusText),
      machine_name: this.clean(context.machineName),
      device_id: this.clean(context.deviceId),
      hostname: this.clean(context.hostname),
      os: this.clean(context.os),
      local_username: this.clean(context.localUsername),
      agent_version: this.clean(context.agentVersion),
      agent_environment: this.clean(context.agentEnvironment),
    };
  }

  private async trySyncContactCustomAttributes(
    chatwootConfig: ChatwootConnectionConfig,
    conversationId: string,
    customAttributes: Record<string, unknown>,
  ) {
    try {
      const conversation = await this.chatwootClient.getConversationDetails(chatwootConfig, conversationId);
      const contactIdentifier = this.resolveConversationContactIdentifier(conversation);
      if (!contactIdentifier) {
        return;
      }

      const contactName =
        this.clean(customAttributes.host_alias) ??
        this.clean(customAttributes.machine_name) ??
        this.clean(customAttributes.hostname) ??
        this.clean(customAttributes.company_name) ??
        undefined;
      const phoneNumber = this.clean(conversation?.meta?.sender?.phone_number ?? conversation?.contact?.phone_number) ?? undefined;

      await this.chatwootClient.updateContact(chatwootConfig, contactIdentifier, {
        ...(contactName ? { name: contactName } : {}),
        ...(phoneNumber ? { phone_number: phoneNumber } : {}),
        custom_attributes: customAttributes,
      });
    } catch (error: any) {
      this.logger.warn(
        JSON.stringify({
          flow: 'agent_to_chatwoot',
          stage: 'contact_custom_attributes_sync_failed',
          conversationId,
          error: error?.message ?? 'unknown_error',
        }),
      );
    }
  }

  private resolveConversationContactIdentifier(conversation: any): string | null {
    const candidates = [
      conversation?.contact_inbox?.source_id,
      conversation?.meta?.sender?.source_id,
      conversation?.contact?.identifier,
      conversation?.contact?.id,
      conversation?.meta?.sender?.id,
      conversation?.contact_inboxes?.[0]?.source_id,
    ];

    for (const candidate of candidates) {
      const normalized = this.clean(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private buildTechnicalNote(attributes: Record<string, unknown>) {
    const lines = [
      'Contexto tecnico premium recebido do agente desktop.',
      this.line('Estado remoto', attributes.remote_status_text ?? attributes.remote_status),
      this.line('Empresa', attributes.company_name ?? attributes.company_id),
      this.line('Host ID', attributes.host_id),
      this.line('Host Alias', attributes.host_alias),
      this.line('RustDesk ID', attributes.rustdesk_id),
      this.line('Maquina', attributes.machine_name ?? attributes.hostname),
      this.line('Usuario local', attributes.local_username),
      this.line('Sistema operacional', attributes.os),
      this.line('Agente', attributes.agent_version),
      this.line('Ambiente', attributes.agent_environment),
    ].filter(Boolean);

    return lines.join('\n');
  }

  private line(label: string, value: unknown) {
    const normalized = this.clean(value);
    return normalized ? `${label}: ${normalized}` : '';
  }

  private clean(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }
}
