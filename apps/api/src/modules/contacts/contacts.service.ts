import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

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

  async linkContactToCompany(contactId: string, companyId: string) {
    const contact = await this.prisma.companyContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contato nao encontrado');

    return this.prisma.companyContact.update({
      where: { id: contactId },
      data: { companyId },
    });
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
}
