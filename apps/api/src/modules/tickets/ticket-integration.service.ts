import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { normalizePhone } from '@dosc-syspro/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface ResolveCustomerInput {
  companyId?: string | null;
  companyContactId?: string | null;
  customerEmail?: string | null;
  contactWhatsappSnapshot?: string | null;
  contactPhoneSnapshot?: string | null;
  userSelectedCompanyId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RequesterInfo {
  userId: string;
  role: Role;
  email: string;
}

export interface AccessScopeInfo {
  isGlobal: boolean;
  companyIds: string[];
}

export interface LinkedCompanyOption {
  id: string;
  name: string;
}

@Injectable()
export class TicketIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkedCompaniesForRequester(
    requester: RequesterInfo,
    accessScope: AccessScopeInfo,
  ): Promise<LinkedCompanyOption[]> {
    const companiesMap = new Map<string, LinkedCompanyOption>();

    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: requester.userId,
        company: { deletedAt: null },
      },
      include: { company: true },
    });

    for (const membership of memberships) {
      this.addCompanyOption(companiesMap, membership.companyId, membership.company, accessScope);
    }

    const contacts = await this.prisma.companyContact.findMany({
      where: {
        email: requester.email,
        status: 'LINKED',
      },
      include: {
        companyLinks: {
          include: { company: true },
        },
      },
    });

    for (const contact of contacts) {
      for (const link of contact.companyLinks) {
        this.addCompanyOption(companiesMap, link.companyId, link.company, accessScope);
      }
    }

    return Array.from(companiesMap.values());
  }

  async resolveAndValidateCustomer(
    data: ResolveCustomerInput,
    requester: RequesterInfo,
    accessScope: AccessScopeInfo,
  ): Promise<{ resolvedCompanyId: string | null; resolvedContactId: string | null }> {
    const metadataSource =
      data.metadata && typeof data.metadata === 'object' && typeof data.metadata.source === 'string'
        ? data.metadata.source.trim().toLowerCase()
        : null;
    const isChatwootTicket = metadataSource === 'chatwoot';

    let resolvedCompanyId: string | null | undefined = data.companyId?.trim() || undefined;
    let resolvedContactId = data.companyContactId || null;

    const isSystemAdmin = accessScope.isGlobal;

    if (isSystemAdmin && (data.customerEmail || data.contactWhatsappSnapshot || data.contactPhoneSnapshot)) {
      const normalizedEmail = data.customerEmail?.trim().toLowerCase();
      const normalizedWhatsapp = normalizePhone(data.contactWhatsappSnapshot) || undefined;
      const normalizedPhoneSnapshot = normalizePhone(data.contactPhoneSnapshot) || undefined;
      const contactLookupConditions: Prisma.CompanyContactWhereInput[] = [
        ...(normalizedEmail ? [{ email: { equals: normalizedEmail, mode: 'insensitive' as const } }] : []),
        ...(normalizedWhatsapp ? [{ whatsapp: normalizedWhatsapp }] : []),
        ...(normalizedPhoneSnapshot ? [{ whatsapp: normalizedPhoneSnapshot }] : []),
      ];
      const contact = contactLookupConditions.length === 0
        ? null
        : await this.prisma.companyContact.findFirst({
            where: {
              OR: contactLookupConditions,
            },
            select: {
              id: true,
              name: true,
              companyLinks: {
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: { companyId: true },
              },
            },
          });
      if (contact) {
        resolvedContactId = contact.id;
        const linkedCompanyIds = contact.companyLinks.map((link) => link.companyId);

        if (resolvedCompanyId && linkedCompanyIds.length > 0 && !linkedCompanyIds.includes(resolvedCompanyId)) {
          throw new BadRequestException('A empresa selecionada nao esta vinculada ao contato informado.');
        }

        if (!resolvedCompanyId) {
          resolvedCompanyId = this.getPrimaryCompanyId(contact) ?? undefined;
        }

        if (isChatwootTicket && linkedCompanyIds.length === 0) {
          throw new BadRequestException('O contato do Chatwoot precisa estar vinculado a uma empresa no portal para abrir ticket.');
        }
      } else if (isChatwootTicket) {
        throw new BadRequestException('O contato do Chatwoot precisa existir no portal e estar vinculado a uma empresa para abrir ticket.');
      }
    } else if (!isSystemAdmin) {
      const selfContact = await this.prisma.companyContact.findFirst({
        where: { email: requester.email },
        select: {
          id: true,
          companyLinks: {
            where: { isPrimary: true },
            select: { companyId: true },
            take: 1,
          },
        },
      });
      if (selfContact) {
        resolvedContactId = selfContact.id;
      }
      
      if (data.userSelectedCompanyId) {
        resolvedCompanyId = data.userSelectedCompanyId.trim();
      } else if (selfContact) {
        resolvedCompanyId = this.getPrimaryCompanyId(selfContact);
      } else {
        const membership = await this.prisma.membership.findFirst({
          where: { userId: requester.userId, company: { deletedAt: null } },
          select: { companyId: true },
        });
        resolvedCompanyId = membership?.companyId;
      }
    }

    if (isChatwootTicket && (!resolvedCompanyId || !resolvedContactId)) {
      throw new BadRequestException('Tickets originados do Chatwoot exigem contato vinculado a uma empresa do portal.');
    }

    if (resolvedCompanyId) {
      await this.assertCompanyIsActiveAndAccessible(resolvedCompanyId, accessScope);
    } else if (!accessScope.isGlobal) {
      throw new BadRequestException('Empresa obrigatoria para abrir ticket.');
    }

    return {
      resolvedCompanyId: resolvedCompanyId || null,
      resolvedContactId,
    };
  }

  private addCompanyOption(
    companiesMap: Map<string, LinkedCompanyOption>,
    companyId: string,
    company: { id: string; nomeFantasia: string | null; razaoSocial: string; deletedAt?: Date | null } | null,
    accessScope: AccessScopeInfo,
  ) {
    if (!company || company.deletedAt) return;
    if (!accessScope.isGlobal && !accessScope.companyIds.includes(companyId)) return;

    companiesMap.set(company.id, {
      id: company.id,
      name: company.nomeFantasia || company.razaoSocial,
    });
  }

  private async assertCompanyIsActiveAndAccessible(companyId: string, accessScope: AccessScopeInfo) {
    if (!accessScope.isGlobal) {
      if (accessScope.companyIds.includes(companyId)) {
        return;
      }
      throw new NotFoundException('Empresa nao encontrada para este usuario.');
    }

    const companyExists = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true },
    });

    if (!companyExists) {
      throw new NotFoundException('Empresa nao encontrada para vincular ao ticket.');
    }
  }

  private getPrimaryCompanyId(contact: { companyLinks?: Array<{ companyId: string }> }) {
    return contact.companyLinks?.[0]?.companyId || null;
  }
}
