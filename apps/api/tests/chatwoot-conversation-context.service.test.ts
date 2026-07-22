import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatwootConversationContextService } from '../src/modules/integrations/chatwoot/chatwoot-conversation-context.service';

describe('ChatwootConversationContextService outbox', () => {
  const prisma = {
    chatwootConversationContextOutbox: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
  };
  const integrationContext = { listActiveContexts: vi.fn(), getDefaultContext: vi.fn() };
  const chatwootClient = {
    updateConversationCustomAttributes: vi.fn(), updateContact: vi.fn(),
    listConversationLabels: vi.fn(), setConversationLabels: vi.fn(),
  };
  let service: ChatwootConversationContextService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatwootConversationContextService(prisma as any, {} as any, integrationContext as any, chatwootClient as any);
    prisma.chatwootConversationContextOutbox.findMany.mockResolvedValue([{ id: 'outbox-1', revision: 3 }]);
    prisma.chatwootConversationContextOutbox.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    prisma.chatwootConversationContextOutbox.findUnique.mockResolvedValue({
      id: 'outbox-1', revision: 3, attempts: 1,
      payload: {
        chatwootAccountId: '1', chatwootConversationId: 'conversation-1', chatwootContactId: 'contact-1',
        portalContactId: 'portal-contact-1', companyId: 'company-1', companyName: 'Jaguar Auto Pecas',
        companyCnpj: '12345678000199', primaryCompanyId: 'company-1', primaryCompanyName: 'Jaguar Auto Pecas',
        companiesCount: 1, linkedAt: '2026-07-22T20:00:00.000Z',
      }, context: { id: 'context-1' },
    });
    integrationContext.listActiveContexts.mockResolvedValue([{ chatwoot: { accountId: '1' } }]);
    chatwootClient.listConversationLabels.mockResolvedValue(['atendimento']);
  });

  it('sincroniza atributos e etiqueta de forma idempotente a partir da outbox', async () => {
    await service.flushPending();
    expect(chatwootClient.updateConversationCustomAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '1' }), 'conversation-1',
      expect.objectContaining({ portal_company_id: 'company-1', portal_company_link_status: 'linked' }),
    );
    expect(chatwootClient.updateContact).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '1' }), 'contact-1',
      expect.objectContaining({ custom_attributes: expect.objectContaining({ portal_contact_id: 'portal-contact-1', portal_companies_count: 1 }) }),
    );
    expect(chatwootClient.setConversationLabels).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: '1' }), 'conversation-1', ['atendimento', 'cliente_vinculado'],
    );
    expect(prisma.chatwootConversationContextOutbox.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SYNCED' }) }),
    );
  });

  it('mantem o evento pendente com backoff quando o Chatwoot nao esta configurado', async () => {
    integrationContext.listActiveContexts.mockResolvedValue([]);
    integrationContext.getDefaultContext.mockResolvedValue(null);
    await service.flushPending();
    expect(chatwootClient.updateConversationCustomAttributes).not.toHaveBeenCalled();
    expect(prisma.chatwootConversationContextOutbox.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', errorCode: 'CHATWOOT_CONTEXT_NOT_CONFIGURED', lockedAt: null }) }),
    );
  });
});
