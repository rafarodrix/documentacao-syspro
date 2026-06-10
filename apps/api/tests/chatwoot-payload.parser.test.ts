import { describe, expect, it } from 'vitest';
import { ChatwootPayloadParser } from '../src/modules/integrations/chatwoot/chatwoot-payload.parser';

describe('ChatwootPayloadParser', () => {
  it('extracts deleted message id from conversation messages when webhook omits top-level id', () => {
    const payload = {
      event: 'message_deleted',
      conversation: {
        id: 321,
        messages: [
          { id: 98765, content: 'Mensagem apagada', deleted: true, message_type: 'outgoing' },
        ],
      },
    };

    expect(ChatwootPayloadParser.extractDeletionTargetMessageId(payload)).toBe('98765');
  });

  it('prefers nested message id over top-level webhook id for deletion events', () => {
    const payload = {
      event: 'message_updated',
      id: 'webhook-event-123',
      message: {
        id: 45678,
        content: 'This message was deleted',
        deleted: true,
      },
    };

    expect(ChatwootPayloadParser.extractDeletionTargetMessageId(payload)).toBe('45678');
  });
});
