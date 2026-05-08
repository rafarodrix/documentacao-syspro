import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { ResolvedIntegrationContext } from '../../settings/integration-context.service';
import { ChatwootClient } from './chatwoot.client';
import { ChatwootPayloadParser } from './chatwoot-payload.parser';
import { ChatwootBehaviorService } from './chatwoot-behavior.service';
import type { ChatwootBehaviorSettings } from '@dosc-syspro/contracts/chatwoot';

@Injectable()
export class ChatwootCsatService {
  private readonly logger = new Logger(ChatwootCsatService.name);

  static readonly CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG = 'tris_csat_force_resolved_on_next_open';
  private static readonly CSAT_TIMEOUT_CLOSURE_ORIGIN = 'inactivity_timeout';
  private static readonly CSAT_VOICE_CLOSURE_ORIGIN = 'voice_followup';
  private static readonly CSAT_RATING_MIN = 1;
  private static readonly CSAT_RATING_MAX = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatwootClient: ChatwootClient,
    private readonly behaviorService: ChatwootBehaviorService,
  ) {}

  async handleCsatReplyIfApplicable(
    payload: any,
    settings: ChatwootBehaviorSettings,
    resolvedContext: ResolvedIntegrationContext,
  ): Promise<boolean> {
    if (!settings.csatEnabled) return false;

    const context = ChatwootPayloadParser.resolveMessageContext(payload);
    if (context.isPrivate || context.messageType !== 'incoming') return false;

    const conversationId = ChatwootPayloadParser.extractConversationId(payload);
    if (!conversationId) return false;

    const customAttributes = await this.behaviorService.resolveConversationCustomAttributes(
      payload, resolvedContext, conversationId,
    );
    if (!ChatwootPayloadParser.readBoolean(customAttributes.csat_pending)) return false;

    if (this.hasPendingCsatTimedOut(customAttributes, settings)) {
      await this.completePendingCsatWithoutAttempt(
        conversationId,
        customAttributes,
        resolvedContext,
        settings,
        ChatwootCsatService.CSAT_TIMEOUT_CLOSURE_ORIGIN,
        'csat_pending_timed_out_before_reply',
      );
      return false;
    }

    if (this.shouldInterruptPendingCsatForVoiceMessage(payload)) {
      await this.completePendingCsatWithoutAttempt(
        conversationId,
        customAttributes,
        resolvedContext,
        settings,
        ChatwootCsatService.CSAT_VOICE_CLOSURE_ORIGIN,
        'csat_pending_interrupted_by_voice_message',
      );
      return false;
    }

    const score = this.parseCsatScore(
      payload?.content ??
      context.message?.content ??
      payload?.content_attributes?.message ??
      context.message?.content_attributes?.message,
    );
    if (score === null) {
      return this.handleInvalidCsatReply(conversationId, customAttributes, resolvedContext, settings);
    }

    const contact = ChatwootPayloadParser.extractContactPhone(payload) ??
      ChatwootPayloadParser.toOptionalString(customAttributes.csat_contact) ?? null;
    const agentId = ChatwootPayloadParser.toOptionalString(customAttributes.csat_agent_id) ?? null;
    const agentName = ChatwootPayloadParser.toOptionalString(customAttributes.csat_agent_name) ?? null;
    const isLowScore = score <= settings.csatLowScoreThreshold;
    const respondedAt = new Date().toISOString();

    await this.prisma.chatwootCsatRating.upsert({
      where: { chatwootConversationId: conversationId },
      update: {
        score,
        contact,
        agentId,
        agentName,
        status: isLowScore ? 'LOW_SCORE' : 'RECORDED',
        respondedAt: new Date(respondedAt),
        requestedAt: ChatwootPayloadParser.parseOptionalDate(customAttributes.csat_requested_at),
      },
      create: {
        chatwootConversationId: conversationId,
        connectionKey: resolvedContext.connectionKey,
        contact,
        agentId,
        agentName,
        score,
        status: isLowScore ? 'LOW_SCORE' : 'RECORDED',
        requestedAt: ChatwootPayloadParser.parseOptionalDate(customAttributes.csat_requested_at),
        respondedAt: new Date(respondedAt),
      },
    });

    await this.chatwootClient.updateConversationCustomAttributes(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      {
        ...customAttributes,
        csat_pending: false,
        csat_status: isLowScore ? 'low_score' : 'recorded',
        csat_score: score,
        csat_responded_at: respondedAt,
        csat_invalid_reply_count: 0,
        [ChatwootCsatService.CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG]: !isLowScore || !settings.csatReopenOnLowScore,
      },
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    if (settings.sendCsatThankYouMessage && settings.csatThankYouMessage.trim()) {
      await this.chatwootClient.createOutgoingMessage(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        settings.csatThankYouMessage.trim(),
        {
          useSystemBot: settings.systemMessagesUseBotIdentity,
          contentAttributes: ChatwootPayloadParser.buildSystemMessageAttributes(),
        },
      );
    }

    const nextStatus = isLowScore && settings.csatReopenOnLowScore ? 'open' : 'resolved';
    await this.chatwootClient.toggleConversationStatus(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      nextStatus,
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    if (!isLowScore || !settings.csatReopenOnLowScore) {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_conversation_resolved_after_reply',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
      }));
      if (settings.releaseConversationLinkOnResolved) {
        await this.prisma.conversationLink.deleteMany({
          where: { chatwootConversationId: conversationId, connectionKey: resolvedContext.connectionKey },
        });
      }
    } else {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_conversation_kept_open_for_low_score',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
      }));
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'csat_recorded',
      conversationId,
      score,
      lowScore: isLowScore,
      connectionKey: resolvedContext.connectionKey,
    }));

    return true;
  }

  async triggerCsatSurveyForResolvedConversation(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
    conversationId: string,
    status: string,
  ): Promise<void> {
    const customAttributes = await this.behaviorService.resolveConversationCustomAttributes(
      payload, resolvedContext, conversationId, { forceRefresh: true },
    );

    if (this.shouldSkipCsat(customAttributes)) {
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_skipped_by_closure_origin',
        conversationId,
        status,
        connectionKey: resolvedContext.connectionKey,
        closureOrigin: ChatwootPayloadParser.toOptionalString(customAttributes.closure_origin) ?? null,
        skipCsat: ChatwootPayloadParser.readBoolean(customAttributes.skip_csat),
      }));
      return;
    }

    if (
      ChatwootPayloadParser.readBoolean(customAttributes.csat_pending) ||
      this.hasCompletedCsatState(customAttributes) ||
      ChatwootPayloadParser.readBoolean(customAttributes[ChatwootCsatService.CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG])
    ) {
      this.logger.debug(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_skipped_existing_state',
        conversationId,
        status,
        connectionKey: resolvedContext.connectionKey,
      }));
      return;
    }

    const requestedAt = new Date().toISOString();
    const timeoutAt = new Date(Date.now() + settings.csatPendingTimeoutHours * 60 * 60 * 1000).toISOString();
    const agent = ChatwootPayloadParser.extractAgentIdentity(payload);
    const contact = ChatwootPayloadParser.extractContactPhone(payload);

    await this.chatwootClient.createOutgoingMessage(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      settings.csatRequestMessage.trim(),
      {
        useSystemBot: settings.systemMessagesUseBotIdentity,
        contentAttributes: ChatwootPayloadParser.buildSystemMessageAttributes(),
      },
    );
    await this.chatwootClient.updateConversationCustomAttributes(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      {
        ...customAttributes,
        csat_pending: true,
        csat_status: 'pending',
        csat_requested_at: requestedAt,
        csat_timeout_at: timeoutAt,
        csat_invalid_reply_count: 0,
        csat_agent_id: agent.id,
        csat_agent_name: agent.name,
        csat_contact: contact,
      },
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'csat_requested',
      conversationId,
      status,
      connectionKey: resolvedContext.connectionKey,
      agentId: agent.id ?? null,
      agentName: agent.name ?? null,
    }));
  }

  async forceResolveConversationAfterCsatReply(
    conversationId: string,
    customAttributes: Record<string, unknown>,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<void> {
    try {
      await this.chatwootClient.toggleConversationStatus(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        'resolved',
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      await this.chatwootClient.updateConversationCustomAttributes(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        { ...customAttributes, [ChatwootCsatService.CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG]: false },
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_open_event_reverted_to_resolved',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_open_event_revert_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async clearCsatSkipMarkersOnConversationOpen(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
    conversationId: string,
  ): Promise<void> {
    const customAttributes = await this.behaviorService.resolveConversationCustomAttributes(
      payload, resolvedContext, conversationId,
    );
    const hasSkipCsat = ChatwootPayloadParser.readBoolean(customAttributes.skip_csat);
    const closureOrigin = ChatwootPayloadParser.toOptionalString(customAttributes.closure_origin) ?? null;
    if (!hasSkipCsat && !closureOrigin) return;

    try {
      await this.chatwootClient.updateConversationCustomAttributes(
        ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
        conversationId,
        { ...customAttributes, skip_csat: false, closure_origin: null },
        { useSystemBot: settings.systemMessagesUseBotIdentity },
      );
      this.logger.log(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_skip_markers_cleared_on_open',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        previousClosureOrigin: closureOrigin,
        previousSkipCsat: hasSkipCsat,
      }));
    } catch (error: any) {
      this.logger.warn(JSON.stringify({
        flow: 'chatwoot_to_portal',
        stage: 'csat_skip_markers_clear_failed',
        conversationId,
        connectionKey: resolvedContext.connectionKey,
        error: error?.message ?? 'unknown_error',
      }));
    }
  }

  async applyCancellationLabelClosurePolicy(
    payload: any,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
    conversationId: string,
    status: string,
  ): Promise<boolean> {
    const labels = await this.behaviorService.resolveConversationLabels(payload, resolvedContext, conversationId);
    const closureOrigin = ChatwootPayloadParser.resolveCancellationClosureOriginFromLabels(labels);
    if (!closureOrigin) return false;

    const customAttributes = await this.behaviorService.resolveConversationCustomAttributes(
      payload, resolvedContext, conversationId, { forceRefresh: true },
    );
    const nextAttributes = { ...customAttributes, skip_csat: true, closure_origin: closureOrigin };

    if (
      !ChatwootPayloadParser.readBoolean(customAttributes.skip_csat) ||
      ChatwootPayloadParser.toOptionalString(customAttributes.closure_origin) !== closureOrigin
    ) {
      try {
        await this.chatwootClient.updateConversationCustomAttributes(
          ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
          conversationId,
          nextAttributes,
          { useSystemBot: settings.systemMessagesUseBotIdentity },
        );
      } catch (error: any) {
        this.logger.warn(JSON.stringify({
          flow: 'chatwoot_to_portal',
          stage: 'cancellation_label_policy_custom_attributes_failed',
          conversationId,
          status,
          connectionKey: resolvedContext.connectionKey,
          closureOrigin,
          labels,
          error: error?.message ?? 'unknown_error',
        }));
      }
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: 'csat_skipped_by_cancellation_label',
      conversationId,
      status,
      connectionKey: resolvedContext.connectionKey,
      closureOrigin,
      labels,
    }));

    return true;
  }

  private async handleInvalidCsatReply(
    conversationId: string,
    customAttributes: Record<string, unknown>,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
  ): Promise<boolean> {
    const invalidReplyCount = ChatwootPayloadParser.parseOptionalInt(customAttributes.csat_invalid_reply_count) ?? 0;
    const nextInvalidReplyCount = invalidReplyCount + 1;
    const maxAttempts = settings.csatInvalidReplyMaxAttempts;
    const exhaustedAttempts = nextInvalidReplyCount >= maxAttempts;
    const now = new Date().toISOString();

    await this.chatwootClient.updateConversationCustomAttributes(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      {
        ...customAttributes,
        csat_pending: exhaustedAttempts ? false : true,
        csat_status: exhaustedAttempts ? 'skipped_no_score' : 'pending_retry',
        csat_invalid_reply_count: nextInvalidReplyCount,
        csat_last_invalid_reply_at: now,
        [ChatwootCsatService.CSAT_FORCE_RESOLVED_ON_NEXT_OPEN_FLAG]: true,
        ...(exhaustedAttempts ? { csat_abandoned_at: now } : {}),
      },
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    const reminderMessage = exhaustedAttempts
      ? settings.csatInvalidReplyFinalMessage.trim()
      : `${settings.csatInvalidReplyRetryMessage.trim()}\n\nTentativa ${nextInvalidReplyCount}/${maxAttempts}.`;

    await this.chatwootClient.createOutgoingMessage(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      reminderMessage,
      {
        useSystemBot: settings.systemMessagesUseBotIdentity,
        contentAttributes: ChatwootPayloadParser.buildSystemMessageAttributes(),
      },
    );

    await this.chatwootClient.toggleConversationStatus(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      'resolved',
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    if (exhaustedAttempts) {
      await this.prisma.conversationLink.deleteMany({
        where: { chatwootConversationId: conversationId, connectionKey: resolvedContext.connectionKey },
      });
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage: exhaustedAttempts ? 'csat_invalid_reply_exhausted' : 'csat_invalid_reply_reminded',
      conversationId,
      invalidReplyCount: nextInvalidReplyCount,
      maxAttempts,
      connectionKey: resolvedContext.connectionKey,
    }));

    return true;
  }

  parseCsatScore(value: unknown): number | null {
    const normalized = String(value ?? '').trim();
    if (!/^[1-5]$/.test(normalized)) return null;
    const score = Number(normalized);
    if (score < ChatwootCsatService.CSAT_RATING_MIN || score > ChatwootCsatService.CSAT_RATING_MAX) return null;
    return score;
  }

  shouldSkipCsat(customAttributes: Record<string, unknown>): boolean {
    if (ChatwootPayloadParser.readBoolean(customAttributes.skip_csat)) return true;
    const closureOrigin = String(customAttributes.closure_origin ?? '').trim().toLowerCase();
    return closureOrigin === 'inactivity_timeout';
  }

  hasCompletedCsatState(customAttributes: Record<string, unknown>): boolean {
    if (customAttributes.csat_responded_at || customAttributes.csat_abandoned_at) return true;
    const csatStatus = String(customAttributes.csat_status ?? '').trim().toLowerCase();
    return csatStatus === 'recorded' || csatStatus === 'low_score' || csatStatus === 'skipped_no_score';
  }

  private hasPendingCsatTimedOut(
    customAttributes: Record<string, unknown>,
    settings: ChatwootBehaviorSettings,
  ): boolean {
    const timeoutAt = ChatwootPayloadParser.parseOptionalDate(customAttributes.csat_timeout_at);
    if (timeoutAt) {
      return timeoutAt.getTime() <= Date.now();
    }

    const requestedAt = ChatwootPayloadParser.parseOptionalDate(customAttributes.csat_requested_at);
    if (!requestedAt) return false;

    return requestedAt.getTime() + settings.csatPendingTimeoutHours * 60 * 60 * 1000 <= Date.now();
  }

  private shouldInterruptPendingCsatForVoiceMessage(payload: any): boolean {
    const candidates = [
      ...(Array.isArray(payload?.attachments) ? payload.attachments : []),
      ...(Array.isArray(payload?.message?.attachments) ? payload.message.attachments : []),
      ...(Array.isArray(payload?.conversation?.messages?.[0]?.attachments) ? payload.conversation.messages[0].attachments : []),
    ];

    return candidates.some((attachment: any) => {
      const fileType = String(attachment?.file_type ?? attachment?.data?.content_type ?? attachment?.content_type ?? '').trim().toLowerCase();
      const mimeType = String(attachment?.data?.content_type ?? attachment?.mimetype ?? '').trim().toLowerCase();
      return fileType === 'audio' || mimeType.startsWith('audio/');
    });
  }

  private async completePendingCsatWithoutAttempt(
    conversationId: string,
    customAttributes: Record<string, unknown>,
    resolvedContext: ResolvedIntegrationContext,
    settings: ChatwootBehaviorSettings,
    closureOrigin: string,
    stage: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.chatwootClient.updateConversationCustomAttributes(
      ChatwootPayloadParser.withSystemMessageConfig(resolvedContext.chatwoot, settings),
      conversationId,
      {
        ...customAttributes,
        csat_pending: false,
        csat_status: 'skipped_no_score',
        csat_abandoned_at: customAttributes.csat_abandoned_at ?? now,
        skip_csat: true,
        closure_origin: closureOrigin,
      },
      { useSystemBot: settings.systemMessagesUseBotIdentity },
    );

    if (settings.releaseConversationLinkOnResolved) {
      await this.prisma.conversationLink.deleteMany({
        where: { chatwootConversationId: conversationId, connectionKey: resolvedContext.connectionKey },
      });
    }

    this.logger.log(JSON.stringify({
      flow: 'chatwoot_to_portal',
      stage,
      conversationId,
      connectionKey: resolvedContext.connectionKey,
      closureOrigin,
    }));
  }
}
