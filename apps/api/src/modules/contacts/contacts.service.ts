import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';

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
    if (input.phone !== undefined) data.phone = input.phone?.trim() || null;
    if (input.whatsapp !== undefined) data.whatsapp = input.whatsapp?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.companyId !== undefined) data.companyId = input.companyId?.trim() || null;

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
      data: { companyId },
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

  // Sincronizacao incremental via integracao oficial (Evolution -> nossa API)
  async syncFromIntegration(instanceName?: string) {
    this.logger.log(`Iniciando sincronizacao de contatos${instanceName ? ` da instancia: ${instanceName}` : ''}`);

    let syncedCount = 0;
    try {
      const evolutionContacts = await this.evolutionClient.findContacts(instanceName);

      for (const ec of evolutionContacts) {
        const phoneId = ec.id?.split('@')[0] || ec.remoteJid?.split('@')[0];
        if (!phoneId) continue;

        const exists = await this.prisma.companyContact.findFirst({ where: { whatsapp: phoneId } });

        if (!exists) {
          await this.prisma.companyContact.create({
            data: { name: ec.pushName || ec.name || 'Sem Nome', whatsapp: phoneId },
          });
          syncedCount++;
        }
      }
    } catch (error: any) {
      this.logger.error(`Erro ao sincronizar contatos: ${error.message}`);
      throw new Error('Falha na sincronizacao de contatos da integracao');
    }

    return {
      success: true,
      syncedCount,
      mode: 'incremental',
      message: `${syncedCount} novos contatos importados.`,
    };
  }

  private async syncChatwootContactName(updatedContact: {
    name: string;
    whatsapp: string | null;
    company?: { nomeFantasia?: string | null; razaoSocial?: string | null } | null;
  }) {
    try {
      if (!updatedContact.whatsapp) return;

      const link = await this.prisma.conversationLink.findUnique({
        where: { whatsappNumber: updatedContact.whatsapp },
      });

      if (!link?.chatwootContactId) return;

      const companyName = updatedContact.company?.nomeFantasia || updatedContact.company?.razaoSocial || '';
      const fullName = companyName ? `${updatedContact.name} - ${companyName}` : updatedContact.name;

      await this.chatwootClient.updateContact(link.chatwootContactId, { name: fullName });
      this.logger.log(`Nome atualizado no Chatwoot para o contato ${updatedContact.whatsapp}: ${fullName}`);
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar nome do contato no Chatwoot: ${error.message}`);
    }
  }
}
