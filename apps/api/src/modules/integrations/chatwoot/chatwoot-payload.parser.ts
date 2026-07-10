import type { ChatwootConnectionConfig } from './chatwoot.client';
import type { ResolvedIntegrationContext } from '../../settings/integration-context.service';
import type { ChatwootBehaviorSettings } from '@dosc-syspro/contracts/chatwoot';
import { onlyDigits } from '@dosc-syspro/shared';

export type MessageContext = {
  message: any | null;
  conversationMessage: any | null;
  messageId?: string;
  messageType: 'incoming' | 'outgoing' | 'template' | 'unknown';
  isPrivate: boolean;
};

export class ChatwootPayloadParser {
  // ──────────────────────────────────────────────────────
  // Message context
  // ──────────────────────────────────────────────────────

  static resolveMessageContext(payload: any): MessageContext {
    const message = ChatwootPayloadParser.extractNestedMessage(payload);
    const messageId = ChatwootPayloadParser.extractPrimaryMessageId(payload, message);
    const conversationMessage = ChatwootPayloadParser.findConversationMessage(payload, messageId);
    const messageType = ChatwootPayloadParser.normalizeMessageType(
      payload?.message_type ??
      message?.message_type ??
      conversationMessage?.message_type,
    );
    const isPrivate = ChatwootPayloadParser.readBoolean(
      payload?.private ??
      message?.private ??
      conversationMessage?.private,
    );
    return { message, conversationMessage, messageId, messageType, isPrivate };
  }

  static extractDeletionTargetMessageId(payload: any): string | undefined {
    const message = ChatwootPayloadParser.extractNestedMessage(payload);
    const directCandidates = [
      message?.id,
      payload?.message_id,
      payload?.messageId,
      payload?.meta?.message_id,
      payload?.meta?.messageId,
      payload?.meta?.message?.id,
      payload?.payload?.message_id,
      payload?.payload?.messageId,
      payload?.payload?.message?.id,
      payload?.event_data?.message_id,
      payload?.event_data?.messageId,
      payload?.event_data?.message?.id,
      payload?.content_attributes?.message_id,
      payload?.content_attributes?.messageId,
    ];

    for (const candidate of directCandidates) {
      const normalized = ChatwootPayloadParser.toOptionalString(candidate);
      if (normalized) return normalized;
    }

    const deletedConversationMessage = ChatwootPayloadParser.findDeletedConversationMessage(payload);
    const deletedConversationMessageId = ChatwootPayloadParser.toOptionalString(deletedConversationMessage?.id);
    if (deletedConversationMessageId) return deletedConversationMessageId;

    return ChatwootPayloadParser.extractPrimaryMessageId(payload, message);
  }

  static findConversationMessage(payload: any, messageId?: string): any | null {
    const messages = ChatwootPayloadParser.collectConversationMessages(payload);
    if (messages.length === 0) return null;
    if (messageId) {
      const match = messages.find((item: any) => String(item?.id ?? '') === messageId);
      if (match) return match;
    }
    return messages[0] ?? null;
  }

  static findDeletedConversationMessage(payload: any): any | null {
    const messages = ChatwootPayloadParser.collectConversationMessages(payload);
    if (messages.length === 0) return null;

    const match = messages.find((item: any) => ChatwootPayloadParser.shouldPropagateMessageDeletion(item, item));
    return match ?? null;
  }

  static normalizeMessageType(value: unknown): 'incoming' | 'outgoing' | 'template' | 'unknown' {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'incoming' || normalized === 'outgoing' || normalized === 'template') return normalized;
    if (normalized === '0') return 'incoming';
    if (normalized === '1') return 'outgoing';
    if (normalized === '2') return 'template';
    return 'unknown';
  }

  // ──────────────────────────────────────────────────────
  // Conversation extractors
  // ──────────────────────────────────────────────────────

  static extractConversationId(payload: any): string | undefined {
    const { message, conversationMessage } = ChatwootPayloadParser.resolveMessageContext(payload);
    return ChatwootPayloadParser.toOptionalString(
      payload?.conversation?.id ??
      payload?.conversation_id ??
      message?.conversation_id ??
      message?.conversation?.id ??
      conversationMessage?.conversation_id ??
      conversationMessage?.conversation?.id,
    );
  }

  static normalizeConversationStatus(value: unknown): string | null {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return null;
    return normalized;
  }

  static extractConversationLabels(payload: any): string[] {
    const candidates = [
      payload?.labels,
      payload?.conversation?.labels,
      payload?.meta?.labels,
      payload?.payload?.labels,
    ];
    for (const candidate of candidates) {
      if (!Array.isArray(candidate)) continue;
      const labels = candidate
        .map((value: any) =>
          ChatwootPayloadParser.toOptionalString(
            typeof value === 'string' ? value : value?.title ?? value?.name ?? value?.label,
          ),
        )
        .filter((value): value is string => Boolean(value))
        .map((value) => value.trim().toLowerCase());
      if (labels.length > 0) return Array.from(new Set(labels));
    }
    return [];
  }

  static readConversationCustomAttributesFromPayload(payload: any): Record<string, unknown> {
    const value =
      payload?.conversation?.custom_attributes ??
      payload?.custom_attributes ??
      payload?.meta?.custom_attributes ??
      payload?.payload?.custom_attributes;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};
  }

  // ──────────────────────────────────────────────────────
  // Sender / agent extractors
  // ──────────────────────────────────────────────────────

  static extractSenderAgentId(payload: any): string | undefined {
    const { message, conversationMessage } = ChatwootPayloadParser.resolveMessageContext(payload);
    const sender =
      payload?.sender ??
      message?.sender ??
      conversationMessage?.sender ??
      payload?.user ??
      message?.user ??
      conversationMessage?.user;

    const senderType = String(
      sender?.type ??
      sender?.sender_type ??
      payload?.sender_type ??
      message?.sender_type ??
      conversationMessage?.sender_type ??
      '',
    ).trim().toLowerCase();

    if (senderType && !['user', 'agent'].includes(senderType)) return undefined;

    return ChatwootPayloadParser.toOptionalString(
      sender?.id ??
      payload?.sender_id ??
      message?.sender_id ??
      conversationMessage?.sender_id ??
      payload?.user_id ??
      message?.user_id ??
      conversationMessage?.user_id,
    );
  }

  static extractAssigneeId(value: any): string | null {
    return ChatwootPayloadParser.toOptionalString(
      value?.assignee_id ??
      value?.current_assignee_id ??
      value?.assignee?.id ??
      value?.current_assignee?.id ??
      value?.meta?.assignee?.id ??
      value?.meta?.assignee_id ??
      value?.payload?.assignee_id ??
      value?.payload?.assignee?.id,
    ) ?? null;
  }

  static extractAgentIdentity(payload: any): { id?: string; name?: string } {
    const { message, conversationMessage } = ChatwootPayloadParser.resolveMessageContext(payload);
    const sender =
      payload?.sender ??
      message?.sender ??
      conversationMessage?.sender ??
      payload?.conversation?.meta?.assignee;
    return {
      id: ChatwootPayloadParser.toOptionalString(sender?.id ?? payload?.conversation?.meta?.assignee?.id),
      name: ChatwootPayloadParser.toOptionalString(
        sender?.name ??
        sender?.available_name ??
        payload?.conversation?.meta?.assignee?.name ??
        payload?.conversation?.meta?.assignee?.available_name,
      ),
    };
  }

  // ──────────────────────────────────────────────────────
  // Contact extractors
  // ──────────────────────────────────────────────────────

  static extractContactPhone(payload: any): string | undefined {
    const value = ChatwootPayloadParser.toOptionalString(
      payload?.phone_number ??
      payload?.phoneNumber ??
      payload?.contact?.phone_number ??
      payload?.contact?.phoneNumber ??
      payload?.additional_attributes?.phone_number ??
      payload?.contact?.additional_attributes?.phone_number,
    );
    const digits = onlyDigits(value);
    return digits || undefined;
  }

  static extractContactSourceIds(payload: any): string[] {
    const sourceIds = [
      payload?.source_id,
      payload?.sourceId,
      payload?.contact?.source_id,
      payload?.contact?.sourceId,
      ...(Array.isArray(payload?.contact_inboxes)
        ? payload.contact_inboxes.map((item: any) => item?.source_id ?? item?.sourceId)
        : []),
      ...(Array.isArray(payload?.contact?.contact_inboxes)
        ? payload.contact.contact_inboxes.map((item: any) => item?.source_id ?? item?.sourceId)
        : []),
    ]
      .map((value) => ChatwootPayloadParser.toOptionalString(value))
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(sourceIds));
  }

  // ──────────────────────────────────────────────────────
  // Message deletion detection
  // ──────────────────────────────────────────────────────

  static shouldPropagateMessageDeletion(payload: any, conversationMessage: any | null): boolean {
    const message = ChatwootPayloadParser.extractNestedMessage(payload);
    const explicitFlags = [
      payload?.deleted, payload?.is_deleted, payload?.content_attributes?.deleted,
      message?.deleted, message?.is_deleted, message?.content_attributes?.deleted,
      conversationMessage?.deleted, conversationMessage?.is_deleted, conversationMessage?.content_attributes?.deleted,
      payload?.deleted_at, message?.deleted_at, conversationMessage?.deleted_at,
    ];
    if (explicitFlags.some(Boolean)) return true;

    const contentCandidates = [payload?.content, message?.content, conversationMessage?.content]
      .map((value) => String(value ?? '').trim().toLowerCase())
      .filter(Boolean);

    return contentCandidates.some(
      (content) =>
        content.includes('this message was deleted') ||
        content.includes('message deleted') ||
        content.includes('mensagem apagada') ||
        content.includes('mensagem exclu') ||
        content.includes('mensagem foi apagada'),
    );
  }

  private static extractPrimaryMessageId(payload: any, message: any | null): string | undefined {
    const directCandidates = [
      message?.id,
      payload?.message_id,
      payload?.messageId,
      payload?.meta?.message?.id,
      payload?.payload?.message?.id,
      payload?.event_data?.message?.id,
      payload?.id,
    ];

    for (const candidate of directCandidates) {
      const normalized = ChatwootPayloadParser.toOptionalString(candidate);
      if (normalized) return normalized;
    }

    return undefined;
  }

  private static extractNestedMessage(payload: any): any | null {
    const candidates = [
      payload?.message,
      payload?.meta?.message,
      payload?.payload?.message,
      payload?.event_data?.message,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  private static collectConversationMessages(payload: any): any[] {
    const candidates = [
      payload?.conversation?.messages,
      payload?.messages,
      payload?.meta?.messages,
      payload?.payload?.messages,
      payload?.event_data?.messages,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate;
      }
    }

    return [];
  }

  // ──────────────────────────────────────────────────────
  // System message helpers
  // ──────────────────────────────────────────────────────

  static readonly SYSTEM_MESSAGE_FLAG = 'syspro_system_message';

  static isSystemManagedOutgoingMessage(payload: any, flag = ChatwootPayloadParser.SYSTEM_MESSAGE_FLAG): boolean {
    const { message, conversationMessage } = ChatwootPayloadParser.resolveMessageContext(payload);
    return ChatwootPayloadParser.readBoolean(
      payload?.content_attributes?.[flag] ??
      message?.content_attributes?.[flag] ??
      conversationMessage?.content_attributes?.[flag],
    );
  }

  static buildSystemMessageAttributes(flag = ChatwootPayloadParser.SYSTEM_MESSAGE_FLAG): Record<string, unknown> {
    return { [flag]: true };
  }

  static withSystemMessageConfig(
    config: ResolvedIntegrationContext['chatwoot'],
    settings: ChatwootBehaviorSettings,
  ): ChatwootConnectionConfig {
    return {
      ...config,
      systemBotApiToken: settings.systemMessageApiToken.trim() || undefined,
    };
  }

  // ──────────────────────────────────────────────────────
  // Label / closure policy helpers
  // ──────────────────────────────────────────────────────

  static readonly CANCELLATION_LABEL_TO_CLOSURE_ORIGIN: Record<string, string> = {
    cancelado_cliente: 'cancelled_by_customer',
    cancelado_agente: 'cancelled_by_agent',
    spam: 'spam',
  };

  static resolveCancellationClosureOriginFromLabels(labels: string[]): string | null {
    for (const label of labels) {
      const normalized = label.trim().toLowerCase();
      const closureOrigin = ChatwootPayloadParser.CANCELLATION_LABEL_TO_CLOSURE_ORIGIN[normalized];
      if (closureOrigin) return closureOrigin;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────
  // Primitive coercion helpers
  // ──────────────────────────────────────────────────────

  static readBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  static toOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized || undefined;
  }

  static parseOptionalDate(value: unknown): Date | null {
    const normalized = ChatwootPayloadParser.toOptionalString(value);
    if (!normalized) return null;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  static parseOptionalInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
    const normalized = ChatwootPayloadParser.toOptionalString(value);
    if (!normalized || !/^-?\d+$/.test(normalized)) return null;
    return Number.parseInt(normalized, 10);
  }

  static serializeErrorStack(error: unknown): string | null {
    const stack = error instanceof Error ? error.stack : null;
    if (!stack) return null;
    return stack.split('\n').slice(0, 8).join('\n');
  }
}
