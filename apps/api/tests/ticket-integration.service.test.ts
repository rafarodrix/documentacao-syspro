import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { TicketIntegrationService } from '../src/modules/tickets/ticket-integration.service';

describe('TicketIntegrationService', () => {
  const prismaMock = {
    companyContact: {
      findFirst: vi.fn(),
    },
    company: {
      findFirst: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
    },
  };

  let service: TicketIntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TicketIntegrationService(prismaMock as any);
  });

  const mockRequester = {
    userId: 'user-123',
    role: Role.CLIENTE_USER,
    email: 'user@example.com',
  };

  const mockAccessScope = {
    isGlobal: false,
    companyIds: ['company-1'],
  };

  it('should resolve and validate company for non-admin user with correct memberships', async () => {
    prismaMock.companyContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      companyLinks: [{ companyId: 'company-1' }],
    });

    const result = await service.resolveAndValidateCustomer(
      {
        companyId: 'company-1',
      },
      mockRequester,
      mockAccessScope,
    );

    expect(result.resolvedCompanyId).toBe('company-1');
    expect(result.resolvedContactId).toBe('contact-1');
    expect(prismaMock.companyContact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'user@example.com' },
      }),
    );
  });

  it('should throw BadRequestException for non-admin user when company is missing', async () => {
    prismaMock.companyContact.findFirst.mockResolvedValue(null);
    prismaMock.membership.findFirst.mockResolvedValue(null);

    await expect(
      service.resolveAndValidateCustomer(
        {},
        mockRequester,
        mockAccessScope,
      ),
    ).rejects.toThrow('Empresa obrigatoria para abrir ticket.');
  });

  it('should throw NotFoundException for non-admin user when company is not in access scope', async () => {
    prismaMock.companyContact.findFirst.mockResolvedValue({
      id: 'contact-1',
      companyLinks: [{ companyId: 'company-2' }],
    });

    await expect(
      service.resolveAndValidateCustomer(
        {
          companyId: 'company-2',
        },
        mockRequester,
        mockAccessScope,
      ),
    ).rejects.toThrow('Empresa nao encontrada para este usuario.');
  });

  it('should throw BadRequestException for Chatwoot ticket if contact is not linked to any company', async () => {
    const adminRequester = {
      userId: 'admin-123',
      role: Role.ADMIN,
      email: 'admin@example.com',
    };
    const adminAccessScope = {
      isGlobal: true,
      companyIds: [],
    };

    prismaMock.companyContact.findFirst.mockResolvedValue({
      id: 'contact-cw',
      companyLinks: [], // no companies linked
    });

    await expect(
      service.resolveAndValidateCustomer(
        {
          customerEmail: 'customer@cw.com',
          metadata: { source: 'chatwoot' },
        },
        adminRequester,
        adminAccessScope,
      ),
    ).rejects.toThrow('O contato do Chatwoot precisa estar vinculado a uma empresa no portal para abrir ticket.');
  });
});
