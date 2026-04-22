import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class UserContactAccessService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  async syncAccessFromContact(
    tx: Prisma.TransactionClient,
    userId: string,
    role: Role,
    contactId: string,
  ) {
    if (this.authorizationService.isSystemRole(role)) {
      await tx.membership.deleteMany({
        where: { userId },
      });
      await tx.userContactLink.deleteMany({
        where: { userId },
      });
      return;
    }

    const companyIds = await this.getContactCompanyIds(tx, contactId, true);
    const membershipRole = role === Role.CLIENTE_ADMIN ? Role.CLIENTE_ADMIN : Role.CLIENTE_USER;

    await tx.membership.deleteMany({
      where: { userId, companyId: { notIn: companyIds } },
    });

    for (const companyId of companyIds) {
      await tx.membership.upsert({
        where: { userId_companyId: { userId, companyId } },
        create: {
          userId,
          companyId,
          role: membershipRole,
        },
        update: {
          role: membershipRole,
        },
      });
    }

    await tx.userContactLink.deleteMany({
      where: { userId, companyId: { notIn: companyIds } },
    });

    for (const [index, companyId] of companyIds.entries()) {
      await tx.userContactLink.upsert({
        where: { userId_companyId: { userId, companyId } },
        create: {
          userId,
          companyId,
          contactId,
          isPrimary: index === 0,
        },
        update: {
          contactId,
          isPrimary: index === 0,
        },
      });
    }
  }

  async getContactCompanyIds(
    client: Prisma.TransactionClient,
    contactId: string,
    requireCompany = false,
  ): Promise<string[]> {
    const contact = await (client.companyContact as any).findFirst({
      where: { id: contactId },
      select: {
        id: true,
        companyLinks: {
          select: {
            companyId: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contato informado nao encontrado.');
    }

    const companyIds = this.extractContactCompanyIds(contact);
    if (requireCompany && !companyIds.length) {
      throw new BadRequestException('Contato do usuario precisa estar vinculado a uma empresa.');
    }

    return companyIds;
  }

  private extractContactCompanyIds(contact: any): string[] {
    const fromLinks = Array.isArray(contact?.companyLinks)
      ? contact.companyLinks.map((link: any) => link.companyId).filter(Boolean)
      : [];

    return Array.from(new Set(fromLinks));
  }
}
