import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ResolvedIntegrationContext } from '../../settings/integration-context.service';
import { ChatwootClient } from './chatwoot.client';
import { ChatwootPayloadParser } from './chatwoot-payload.parser';
import type { ChatwootBehaviorSettings } from '@dosc-syspro/contracts/chatwoot';

@Injectable()
export class ChatwootBehaviorService {
  private readonly logger = new Logger(ChatwootBehaviorService.name);

  static readonly SKIP_AUTO_PENDING_ONCE_FLAG = 'tris_skip_auto_pending_once';
  static readonly LAST_AUTO_REOPENED_AT_FLAG = 'tris_last_auto_reopened_at';

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootClient: ChatwootClient,
  ) {}

  async applyMessageBehaviorRules(
    payload: any,
    settings: ChatwootBehaviorSettings,
    resolvedContext: ResolvedIntegrationContext,
  ): Promise<void> {
    if (!resolvedContext.chatwoot.url || !resolvedContext.chatwoot.apiToken || !resolvedContext.chatwoot.accountId) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'behavior_rules_skipped_missing_context',
        event: payload?.event ?? null,
      }));
      return;
    }

    const context = ChatwootPayloadParser.resolveMessageContext(payload);

    if (
      settings.autoAssignOnFirstAgentReply &&
      !context.isPrivate &&
      (context.messageType === 'outgoing' || context.messageType === 'template')
    ) {
      await this.autoAssignConversationToReplyingAgent(payload, resolvedContext, settings);
    } else if (settings.autoAssignOnFirstAgentReply) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_skipped',
        messageType: context.messageType,
        isPrivate: context.isPrivate,
        messageId: context.messageId ?? null,
      }));
    }

    if (
      settings.markConversationPendingOnAgentReply &&
      !context.isPrivate &&
      (context.messageType === 'outgoing' || context.messageType === 'template')
    ) {
      await this.markConversationPendingAfterAgentReply(payload, resolvedContext, settings);
    } else if (settings.markConversationPendingOnAgentReply) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_mark_pending_skipped',
        messageType: context.messageType,
        isPrivate: context.isPrivate,
        messageId: context.messageId ?? null,
      }));
    }

    if (settings.reopenConversationOnCustomerReply && context.messageType === 'incoming') {
      await this.reopenConversationForCustomerReply(payload, resolvedContext, settings);
    }
  }

  async markConversationPendingAfterAgentReply(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<void> {
    const conversationId = ChatwootPayloadParser.extractConversationId(payload);
    if (!conversationId) return;

    const customAttributes = await this.resolveConversationCustomAttributes(payload, resolvedContext, conversationId);
    if (ChatwootPayloadParser.readBoolean(customAttributes[ChatwootBehaviorService.SKIP_AUTO_PENDING_ONCE_FLAG])) {
      await this.clearSkipAutoPendingMarker(conversationId, customAttributes, resolvedContext, settings);
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_mark_pending_skipped_after_auto_reopen',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
      }));
      return;
    }

    let status = ChatwootPayloadParser.normalizeConversationStatus(
      payload?.conversation?.status ?? payload?.status ?? payload?.meta?.status,
    );
    if (!status) {
      try {
        const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
        status = ChatwootPayloadParser.normalizeConversationStatus(conversation?.status ?? conversation?.payload?.status);
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'conversation_pending_status_lookup_failed',
          conversationId,
          error: error?.message ?? 'unknown_error',
        }));
        return;
      }
    }

    if (status === 'pending' || status === 'resolved' || status === 'archived' || status === 'snoozed') {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_mark_pending_skipped_by_status',
        conversationId,
        status,
      }));
      return;
    }

    try {
      await this.chatwootClient.toggleConversationStatus(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        'pending',
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_marked_pending_after_agent_reply',
        conversationId,
        previousStatus: status ?? null,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_mark_pending_failed',
        conversationId,
        previousStatus: status ?? null,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async autoAssignConversationToReplyingAgent(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<void> {
    const conversationId = ChatwootPayloadParser.extractConversationId(payload);
    const assigneeId = ChatwootPayloadParser.extractSenderAgentId(payload);
    if (!conversationId || !assigneeId) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_missing_fields',
        conversationId: conversationId ?? null,
        assigneeId: assigneeId ?? null,
      }));
      return;
    }
    if (!/^\d+$/.test(assigneeId)) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_invalid_assignee',
        conversationId,
        assigneeId,
      }));
      return;
    }

    const currentAssigneeId = await this.resolveCurrentConversationAssigneeId(payload, resolvedContext, conversationId);
    if (currentAssigneeId) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_skipped_already_assigned',
        conversationId,
        currentAssigneeId,
      }));
      return;
    }

    try {
      await this.chatwootClient.assignConversation(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        { assigneeId },
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assigned',
        conversationId,
        assigneeId,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_auto_assign_failed',
        conversationId,
        assigneeId,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async reopenConversationForCustomerReply(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<void> {
    const conversationId = ChatwootPayloadParser.extractConversationId(payload);
    if (!conversationId) return;

    let status = ChatwootPayloadParser.normalizeConversationStatus(
      payload?.conversation?.status ?? payload?.status ?? payload?.meta?.status,
    );
    if (!status) {
      try {
        const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
        status = ChatwootPayloadParser.normalizeConversationStatus(conversation?.status ?? conversation?.payload?.status);
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_evolution',
          stage: 'conversation_status_lookup_failed',
          conversationId,
          error: error?.message ?? 'unknown_error',
        }));
        return;
      }
    }

    if (status === 'open') return;
    if (status === 'resolved' || status === 'archived') {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopen_skipped_for_resolved_reply',
        conversationId,
        previousStatus: status,
      }));
      return;
    }
    if (status === 'snoozed' && !settings.reopenSnoozedConversationOnCustomerReply) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopen_skipped_for_snoozed_reply',
        conversationId,
        previousStatus: status,
      }));
      return;
    }
    if (status === 'pending' && !settings.reopenPendingConversationOnCustomerReply) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopen_skipped_for_pending_reply',
        conversationId,
        previousStatus: status,
      }));
      return;
    }

    try {
      const customAttributes = await this.resolveConversationCustomAttributes(payload, resolvedContext, conversationId);
      await this.chatwootClient.toggleConversationStatus(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        'open',
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      await this.chatwootClient.updateConversationCustomAttributes(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        {
          ...customAttributes,
          [ChatwootBehaviorService.SKIP_AUTO_PENDING_ONCE_FLAG]: true,
          [ChatwootBehaviorService.LAST_AUTO_REOPENED_AT_FLAG]: new Date().toISOString(),
        },
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopened_on_customer_reply',
        conversationId,
        previousStatus: status ?? null,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_reopen_failed',
        conversationId,
        previousStatus: status ?? null,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async clearSkipAutoPendingMarker(
    conversationId: string,
    customAttributes: Record<string, unknown>,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<void> {
    try {
      await this.chatwootClient.updateConversationCustomAttributes(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        { ...customAttributes, [ChatwootBehaviorService.SKIP_AUTO_PENDING_ONCE_FLAG]: false },
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_mark_pending_skip_flag_clear_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async resolveConversationCustomAttributes(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    conversationId: string,
    options?: { forceRefresh?: boolean },
  ): Promise<Record<string, unknown>> {
    const inlineAttributes = ChatwootPayloadParser.readConversationCustomAttributesFromPayload(payload);

    if (!options?.forceRefresh && Object.keys(inlineAttributes).length > 0) {
      return inlineAttributes;
    }

    try {
      const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
      const fromConversation = ChatwootPayloadParser.readConversationCustomAttributesFromPayload(conversation);
      return options?.forceRefresh ? { ...inlineAttributes, ...fromConversation } : fromConversation;
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'custom_attributes_lookup_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
      return inlineAttributes;
    }
  }

  async resolveCurrentConversationAssigneeId(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    conversationId: string,
  ): Promise<string | null> {
    const fromPayload = ChatwootPayloadParser.extractAssigneeId(payload?.conversation ?? payload);
    if (fromPayload) return fromPayload;

    try {
      const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
      return ChatwootPayloadParser.extractAssigneeId(conversation);
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_evolution',
        stage: 'conversation_assignee_lookup_failed',
        conversationId,
        error: error?.message ?? 'unknown_error',
      }));
      return 'lookup_failed';
    }
  }

  async resolveConversationLabels(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    conversationId: string,
  ): Promise<string[]> {
    const fromPayload = ChatwootPayloadParser.extractConversationLabels(payload);
    if (fromPayload.length > 0) return fromPayload;

    try {
      const conversation = await this.chatwootClient.getConversationDetails(resolvedContext.chatwoot, conversationId);
      return ChatwootPayloadParser.extractConversationLabels(conversation);
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'conversation_labels_lookup_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
      return [];
    }
  }
}
