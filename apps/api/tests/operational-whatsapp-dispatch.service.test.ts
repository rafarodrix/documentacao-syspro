import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OperationalWhatsappDispatchService } from '../src/modules/integrations/evolution/operational-whatsapp-dispatch.service';

describe('OperationalWhatsappDispatchService', () => {
  const evolutionClient = {
    sendTextMessage: vi.fn(),
  };
  const integrationContext = {
    listActiveContexts: vi.fn(),
  };

  let service: OperationalWhatsappDispatchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OperationalWhatsappDispatchService(evolutionClient as any, integrationContext as any);
  });

  it('uses the company integration context and persists the provider result', async () => {
    integrationContext.listActiveContexts.mockResolvedValue([
      { connectionKey: 'company-evolution', evolution: { instance: 'company-instance' } },
    ]);
    evolutionClient.sendTextMessage.mockResolvedValue({ messageId: 'provider-message-1' });
    const persistSent = vi.fn().mockResolvedValue({ id: 'request-1' });
    const persistFailed = vi.fn();

    const result = await service.sendAndRecord({
      companyId: 'company-1',
      targetPhone: '5511999999999',
      message: 'Documentos pendentes',
      getNextAttemptNumber: vi.fn().mockResolvedValue(2),
      persistSent,
      persistFailed,
    });

    expect(integrationContext.listActiveContexts).toHaveBeenCalledWith({ companyIds: ['company-1'] });
    expect(evolutionClient.sendTextMessage).toHaveBeenCalledWith(
      { instance: 'company-instance' },
      '5511999999999',
      'Documentos pendentes',
    );
    expect(persistSent).toHaveBeenCalledWith(expect.objectContaining({
      attemptNumber: 2,
      providerMessageId: 'provider-message-1',
      providerConnectionKey: 'company-evolution',
    }));
    expect(persistFailed).not.toHaveBeenCalled();
    expect(result.record).toEqual({ id: 'request-1' });
  });

  it('persists a failed attempt before returning the provider error', async () => {
    integrationContext.listActiveContexts.mockResolvedValue([
      { connectionKey: 'company-evolution', evolution: { instance: 'company-instance' } },
    ]);
    const providerError = new Error('Evolution unavailable');
    evolutionClient.sendTextMessage.mockRejectedValue(providerError);
    const persistFailed = vi.fn().mockResolvedValue(undefined);

    await expect(service.sendAndRecord({
      companyId: 'company-1',
      targetPhone: '5511999999999',
      message: 'Documentos pendentes',
      getNextAttemptNumber: vi.fn().mockResolvedValue(3),
      persistSent: vi.fn(),
      persistFailed,
    })).rejects.toBe(providerError);

    expect(persistFailed).toHaveBeenCalledWith(expect.objectContaining({
      attemptNumber: 3,
      providerConnectionKey: 'company-evolution',
      errorMessage: 'Evolution unavailable',
    }));
  });

  it('does not fall back to another company connection', async () => {
    integrationContext.listActiveContexts.mockResolvedValue([]);

    await expect(service.sendAndRecord({
      companyId: 'company-without-connection',
      targetPhone: '5511999999999',
      message: 'Documentos pendentes',
      getNextAttemptNumber: vi.fn(),
      persistSent: vi.fn(),
      persistFailed: vi.fn(),
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(evolutionClient.sendTextMessage).not.toHaveBeenCalled();
  });
});
