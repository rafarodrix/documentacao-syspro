import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CompanyContactSource, CompanyContactStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { IntegrationContextService } from '../settings/integration-context.service';

type ContactQueryInput = {
  q?: string;
  unlinked?: string;
  companyId?: string;
  limit?: string;
};

type CreateContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyId?: string | null;
  companyIds?: string[] | null;
};

type UpdateContactInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyId?: string | null;
  companyIds?: string[] | null;
};

const CONTACTS_TRANSACTION_TIMEOUT_MS = 15000;

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient,
    private readonly chatwootClient: ChatwootClient,
    private readonly integrationContext: IntegrationContextService,
  ) {}

  async getContacts(input: ContactQueryInput) {
    const q = input.q?.trim();
    const where: any = {};

    if (input.unlinked === 'true') {
      where.companyLinks = { none: {} };
    } else if (input.unlinked === 'false') {
      where.companyLinks = { some: {} };
    } else if (input.companyId?.trim()) {
      where.companyLinks = { some: { companyId: input.companyId.trim() } };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { whatsapp: { contains: q, mode: 'insensitive' } },
        { companyLinks: { some: { company: { razaoSocial: { contains: q, mode: 'insensitive' } } } } },
        { companyLinks: { some: { company: { nomeFantasia: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    const limitParsed = Number.parseInt(input.limit || '50', 10);
    const take = Math.min(200, Math.max(1, Number.isNaN(limitParsed) ? 50 : limitParsed));

    const contacts = await (this.prisma.companyContact as any).findMany({
      where,
      include: this.contactInclude(),
      orderBy: [{ updatedAt: 'desc' }],
      take,
    });

    return contacts.map((contact: any) => this.serializeContact(contact));
  }

  async getUnlinkedContacts() {
    const contacts = await (this.prisma.companyContact as any).findMany({
      where: {
        companyLinks: { none: {} },
      },
      include: this.contactInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contacts.map((contact: any) => this.serializeContact(contact));
  }

  async getContactById(contactId: string) {
    const contact = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');
    return this.serializeContact(contact);
  }

  async createContact(input: CreateContactInput) {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Nome do contato obrigatorio');
    }

    const whatsapp = this.normalizePhone(input.whatsapp);
    const phone = this.normalizePhone(input.phone);
    const companyIds = this.normalizeCompanyIds(input.companyIds, input.companyId);
    const existing = whatsapp
      ? await (this.prisma.companyContact as any).findFirst({
          where: { whatsapp },
          include: this.contactInclude(),
        })
      : null;

    if (existing) {
      const updated = await this.prisma.$transaction(
        async (tx) => {
          const updatedContact = await (tx.companyContact as any).update({
            where: { id: existing.id },
            data: {
              name,
              email: input.email?.trim() || null,
              phone,
              whatsapp,
              notes: input.notes?.trim() || null,
              source: existing.source,
              status: companyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
            },
            include: this.contactInclude(),
          });

          await this.syncContactCompanies(tx, existing.id, companyIds);
          return (tx.companyContact as any).findUnique({
            where: { id: existing.id },
            include: this.contactInclude(),
          });
        },
        { timeout: CONTACTS_TRANSACTION_TIMEOUT_MS }
      );

      const serialized = this.serializeContact(updated);
      await this.syncChatwootContactName(serialized);
      return serialized;
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        const createdContact = await (tx.companyContact as any).create({
          data: {
            name,
            email: input.email?.trim() || null,
            phone,
            whatsapp,
            notes: input.notes?.trim() || null,
            source: CompanyContactSource.MANUAL,
            status: companyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
          },
          include: this.contactInclude(),
        });

        await this.syncContactCompanies(tx, createdContact.id, companyIds);
        return (tx.companyContact as any).findUnique({
          where: { id: createdContact.id },
          include: this.contactInclude(),
        });
      },
      { timeout: CONTACTS_TRANSACTION_TIMEOUT_MS }
    );

    const serialized = this.serializeContact(created);
    await this.syncChatwootContactName(serialized);
    return serialized;
  }

  async updateContact(contactId: string, input: UpdateContactInput) {
    const existing = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!existing) throw new NotFoundException('Contato nao encontrado');

    const nextCompanyIds = input.companyId !== undefined || input.companyIds !== undefined
      ? this.normalizeCompanyIds(input.companyIds, input.companyId)
      : this.extractCompanyIds(existing);

    const data: any = {};
    if (input.name !== undefined) data.name = String(input.name).trim() || existing.name;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.phone !== undefined) data.phone = this.normalizePhone(input.phone);
    if (input.whatsapp !== undefined) data.whatsapp = this.normalizePhone(input.whatsapp);
    if (input.companyId !== undefined || input.companyIds !== undefined) {
      data.status = nextCompanyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK;
    }

    const updated = await this.prisma.$transaction(
      async (tx) => {
        await (tx.companyContact as any).update({
          where: { id: contactId },
          data,
        });

        if (input.companyId !== undefined || input.companyIds !== undefined) {
          await this.syncContactCompanies(tx, contactId, nextCompanyIds);
        }

        return (tx.companyContact as any).findUnique({
          where: { id: contactId },
          include: this.contactInclude(),
        });
      },
      { timeout: CONTACTS_TRANSACTION_TIMEOUT_MS }
    );

    const serialized = this.serializeContact(updated);
    await this.syncChatwootContactName(serialized);
    return serialized;
  }

  async linkContactToCompany(contactId: string, companyId: string) {
    const contact = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');

    const nextCompanyIds = Array.from(new Set([companyId, ...this.extractCompanyIds(contact)]));
    return this.updateContact(contactId, { companyIds: nextCompanyIds });
  }

  async deleteContact(contactId: string) {
    return this.prisma.companyContact.delete({
      where: { id: contactId },
    });
  }

  async syncFromIntegration(instanceName?: string) {
    const context = await this.resolveEvolutionContext(instanceName);
    if (!context) {
      return {
        success: false,
        syncedCount: 0,
        mode: 'unavailable',
        message: 'Nenhuma conexao ativa da Evolution foi encontrada para sincronizar contatos.',
      };
    }

    let contacts: Awaited<ReturnType<EvolutionClient['fetchContacts']>>;
    try {
      contacts = await this.evolutionClient.fetchContacts(context.evolution);
    } catch (error: any) {
      this.logger.warn(
        `Sincronizacao manual de contatos indisponivel para ${context.evolution.instance}: ${error?.message ?? 'unknown_error'}`
      );
      return {
        success: false,
        syncedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        mode: 'unavailable',
        message:
          'A instancia Evolution conectada nao expoe uma rota compativel para sincronizacao manual de contatos ou rejeitou a autenticacao. O fluxo principal de webhook segue operacional.',
        error: error?.message ?? 'unknown_error',
      };
    }
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const contact of contacts) {
      if (!contact.whatsapp) continue;

      const existing = await (this.prisma.companyContact as any).findFirst({
        where: { whatsapp: contact.whatsapp },
        include: this.contactInclude(),
      });

      if (existing) {
        const nextName = contact.name || existing.name;
        const shouldUpdateName = this.shouldSyncEvolutionName(existing);
        const shouldUpdate =
          (shouldUpdateName && existing.name !== nextName) ||
          (existing.status === CompanyContactStatus.ARCHIVED);

        if (shouldUpdate) {
          await (this.prisma.companyContact as any).update({
            where: { id: existing.id },
            data: {
              name: shouldUpdateName ? nextName : existing.name,
              source: existing.source === CompanyContactSource.MANUAL ? existing.source : CompanyContactSource.IMPORT,
              status: this.extractCompanyIds(existing).length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
              whatsapp: contact.whatsapp,
            },
          });
          updatedCount += 1;
        }

        syncedCount += 1;
        continue;
      }

      await this.prisma.companyContact.create({
        data: {
          name: contact.name,
          whatsapp: contact.whatsapp,
          source: CompanyContactSource.IMPORT,
          status: CompanyContactStatus.PENDING_LINK,
        },
      });
      createdCount += 1;
      syncedCount += 1;
    }

    this.logger.log(
      `Sincronizacao Evolution concluida para ${context.evolution.instance}: ${syncedCount} contatos processados (${createdCount} novos, ${updatedCount} atualizados).`
    );

    return {
      success: true,
      syncedCount,
      createdCount,
      updatedCount,
      mode: 'evolution_pull',
      message: `Sincronizacao concluida. ${createdCount} contatos novos e ${updatedCount} atualizados.`,
    };
  }

  private contactInclude() {
    return {
      companyLinks: {
        include: {
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    };
  }

  private serializeContact(contact: any) {
    const companies = (contact?.companyLinks ?? [])
      .map((link: any) => link.company)
      .filter(Boolean);

    const primaryCompany = companies[0] ?? null;

    return {
      ...contact,
      companyId: primaryCompany?.id ?? null,
      company: primaryCompany,
      companyIds: companies.map((company: any) => company.id),
      companies,
    };
  }

  private extractCompanyIds(contact: any): string[] {
    const fromLinks = Array.isArray(contact?.companyLinks)
      ? contact.companyLinks.map((link: any) => link.companyId).filter(Boolean)
      : [];

    if (fromLinks.length) return Array.from(new Set(fromLinks));
    return [];
  }

  private normalizeCompanyIds(companyIds?: string[] | null, companyId?: string | null): string[] {
    const values = [
      ...(Array.isArray(companyIds) ? companyIds : []),
      ...(companyId ? [companyId] : []),
    ]
      .map((value) => String(value ?? '').trim())
      .filter(Boolean);

    return Array.from(new Set(values));
  }

  private async syncContactCompanies(tx: any, contactId: string, companyIds: string[]) {
    await tx.companyContactCompanyLink.deleteMany({
      where: {
        contactId,
        companyId: { notIn: companyIds.length ? companyIds : ['__none__'] },
      },
    });

    if (!companyIds.length) {
      await tx.companyContact.update({
        where: { id: contactId },
        data: {
          status: CompanyContactStatus.PENDING_LINK,
        },
      });
      return;
    }

    for (const [index, currentCompanyId] of companyIds.entries()) {
      await tx.companyContactCompanyLink.upsert({
        where: {
          contactId_companyId: {
            contactId,
            companyId: currentCompanyId,
          },
        },
        create: {
          contactId,
          companyId: currentCompanyId,
          isPrimary: index === 0,
        },
        update: {
          isPrimary: index === 0,
        },
      });
    }

    await tx.companyContact.update({
      where: { id: contactId },
      data: {
        status: CompanyContactStatus.LINKED,
      },
    });
  }

  private async syncChatwootContactName(updatedContact: {
    name: string;
    whatsapp: string | null;
    companyId?: string | null;
    company?: { nomeFantasia?: string | null; razaoSocial?: string | null } | null;
  }) {
    try {
      if (!updatedContact.whatsapp) return;

      const links = await this.prisma.conversationLink.findMany({
        where: {
          whatsappNumber: updatedContact.whatsapp,
          ...(updatedContact.companyId ? { companyId: updatedContact.companyId } : {}),
        },
      });

      if (!links.length) return;

      const companyName = updatedContact.company?.nomeFantasia || updatedContact.company?.razaoSocial || '';
      const fullName = companyName ? `${updatedContact.name} - ${companyName}` : updatedContact.name;

      for (const link of links) {
        if (!link.chatwootContactId) continue;
        const context = await this.integrationContext.resolveByConnectionKey(link.connectionKey);
        if (!context) continue;
        await this.chatwootClient.updateContact(context.chatwoot, link.chatwootContactId, { name: fullName });
      }

      this.logger.log(`Nome atualizado no Chatwoot para o contato ${updatedContact.whatsapp}: ${fullName}`);
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar nome do contato no Chatwoot: ${error.message}`);
    }
  }

  private async resolveEvolutionContext(instanceName?: string) {
    if (!instanceName?.trim()) {
      return this.integrationContext.getDefaultContext();
    }

    const connection = await (this.prisma as any).integrationConnection.findFirst({
      where: {
        status: 'ACTIVE',
        evolutionInstance: instanceName.trim(),
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (!connection) return null;
    return this.integrationContext.resolveByConnectionKey(connection.id);
  }

  private normalizePhone(value?: string | null): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || null;
  }

  private shouldSyncEvolutionName(existing: {
    source: CompanyContactSource;
    companyId?: string | null;
    companyLinks?: Array<{ companyId: string }>;
    notes?: string | null;
    email?: string | null;
    phone?: string | null;
  }): boolean {
    if (existing.source === CompanyContactSource.MANUAL) {
      return false;
    }

    if (existing.source === CompanyContactSource.IMPORT) {
      return true;
    }

    const hasLocalEnrichment = Boolean(
      existing.companyId ||
      existing.companyLinks?.length ||
      existing.notes?.trim() ||
      existing.email?.trim() ||
      existing.phone?.trim()
    );

    return !hasLocalEnrichment;
  }
}
