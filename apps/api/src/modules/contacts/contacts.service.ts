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
      where.companyId = null;
    } else if (input.unlinked === 'false') {
      where.companyId = { not: null };
    } else if (input.companyId?.trim()) {
      where.companyId = input.companyId.trim();
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { whatsapp: { contains: q, mode: 'insensitive' } },
        { company: { razaoSocial: { contains: q, mode: 'insensitive' } } },
        { company: { nomeFantasia: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const limitParsed = Number.parseInt(input.limit || '50', 10);
    const take = Math.min(200, Math.max(1, Number.isNaN(limitParsed) ? 50 : limitParsed));

    return this.prisma.companyContact.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take,
    });
  }

  async getUnlinkedContacts() {
    return this.prisma.companyContact.findMany({
      where: {
        companyId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getContactById(contactId: string) {
    const contact = await this.prisma.companyContact.findUnique({
      where: { id: contactId },
      include: {
        company: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
      },
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');
    return contact;
  }

  async createContact(input: {
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    notes?: string | null;
    companyId?: string | null;
  }) {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Nome do contato obrigatorio');
    }

    const whatsapp = this.normalizePhone(input.whatsapp);
    const phone = this.normalizePhone(input.phone);
    const companyId = input.companyId?.trim() || null;
    const existing = whatsapp
      ? await this.prisma.companyContact.findFirst({
          where: { whatsapp },
          include: { company: true },
        })
      : null;

    if (existing) {
      const updated = await this.prisma.companyContact.update({
        where: { id: existing.id },
        data: {
          name,
          email: input.email?.trim() || null,
          phone,
          whatsapp,
          notes: input.notes?.trim() || null,
          companyId,
          source: existing.source,
          status: companyId ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
        },
        include: { company: true },
      });

      await this.syncChatwootContactName(updated);
      return updated;
    }

    const created = await this.prisma.companyContact.create({
      data: {
        name,
        email: input.email?.trim() || null,
        phone,
        whatsapp,
        notes: input.notes?.trim() || null,
        companyId,
        source: CompanyContactSource.MANUAL,
        status: companyId ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
      },
      include: { company: true },
    });

    await this.syncChatwootContactName(created);
    return created;
  }

  async updateContact(
    contactId: string,
    input: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      whatsapp?: string | null;
      notes?: string | null;
      companyId?: string | null;
    },
  ) {
    const existing = await this.prisma.companyContact.findUnique({
      where: { id: contactId },
    });
    if (!existing) throw new NotFoundException('Contato nao encontrado');

    const data: any = {};

    if (input.name !== undefined) data.name = String(input.name).trim() || existing.name;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.companyId !== undefined) data.companyId = input.companyId?.trim() || null;
    if (input.phone !== undefined) data.phone = this.normalizePhone(input.phone);
    if (input.whatsapp !== undefined) data.whatsapp = this.normalizePhone(input.whatsapp);
    if (input.companyId !== undefined) {
      data.status = input.companyId?.trim() ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK;
    }

    const updatedContact = await this.prisma.companyContact.update({
      where: { id: contactId },
      data,
      include: { company: true },
    });

    await this.syncChatwootContactName(updatedContact);

    return updatedContact;
  }

  async linkContactToCompany(contactId: string, companyId: string) {
    const contact = await this.prisma.companyContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contato nao encontrado');

    const updatedContact = await this.prisma.companyContact.update({
      where: { id: contactId },
      data: { companyId, status: CompanyContactStatus.LINKED },
      include: { company: true },
    });

    await this.syncChatwootContactName(updatedContact);

    return updatedContact;
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

    const contacts = await this.evolutionClient.fetchContacts(context.evolution);
    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const contact of contacts) {
      if (!contact.whatsapp) continue;

      const existing = await this.prisma.companyContact.findFirst({
        where: { whatsapp: contact.whatsapp },
      });

      if (existing) {
        const nextName = contact.name || existing.name;
        const shouldUpdateName = this.shouldSyncEvolutionName(existing);
        const shouldUpdate =
          (shouldUpdateName && existing.name !== nextName) ||
          (existing.status === CompanyContactStatus.ARCHIVED);

        if (shouldUpdate) {
          await this.prisma.companyContact.update({
            where: { id: existing.id },
            data: {
              name: shouldUpdateName ? nextName : existing.name,
              source: existing.source === CompanyContactSource.MANUAL ? existing.source : CompanyContactSource.IMPORT,
              status: existing.companyId ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
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

    // Contatos vindos por WhatsApp so continuam sincronizaveis enquanto nao receberam enriquecimento manual local.
    const hasLocalEnrichment = Boolean(
      existing.companyId ||
      existing.notes?.trim() ||
      existing.email?.trim() ||
      existing.phone?.trim()
    );

    return !hasLocalEnrichment;
  }
}
