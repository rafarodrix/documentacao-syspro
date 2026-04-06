import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Lista todos os contatos que ainda não possuem vínculo com uma Empresa
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

  // Vincula o contato a uma empresa existente
  async linkContactToCompany(contactId: string, companyId: string) {
    const contact = await this.prisma.companyContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contato não encontrado');

    return this.prisma.companyContact.update({
      where: { id: contactId },
      data: { companyId },
    });
  }

  // Exclui um contato (útil para spam ou enganos)
  async deleteContact(contactId: string) {
    return this.prisma.companyContact.delete({
      where: { id: contactId },
    });
  }

  // Sincroniza contatos puxando diretamente da Evolution API
  async syncFromEvolution(instanceName: string) {
    this.logger.log(`Iniciando sincronização de contatos da instância: ${instanceName}`);
    
    const evolutionApiUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Credenciais do Evolution GO não configuradas no ambiente.');
    }

    let syncedCount = 0;
    try {
      // Chamada real ao endpoint do Evolution GO para buscar contatos
      const response = await axios.get(`${evolutionApiUrl}/chat/findContacts/${instanceName}`, {
        headers: { apikey: evolutionApiKey },
      });

      const evolutionContacts = response.data || [];

      for (const ec of evolutionContacts) {
        // O Evolution GO retorna o ID com o sufixo @s.whatsapp.net (Limpamos para ficar apenas os números)
        const phoneId = ec.id?.split('@')[0] || ec.remoteJid?.split('@')[0];
        if (!phoneId) continue;

        const exists = await this.prisma.companyContact.findFirst({ where: { whatsapp: phoneId } });
        
        if (!exists) {
          await this.prisma.companyContact.create({
            // Evolution GO usa pushName ou name
            data: { name: ec.pushName || ec.name || 'Sem Nome', whatsapp: phoneId },
          });
          syncedCount++;
        }
      }
    } catch (error: any) {
      this.logger.error(`Erro ao sincronizar do Evolution GO: ${error.message}`);
      throw new Error('Falha na comunicação com o Evolution GO');
    }

    return { success: true, syncedCount, message: `${syncedCount} novos contatos importados.` };
  }
}