import { ChatwootClientPort, EvolutionClientPort } from '../ports/integration-clients.port';
import { PrismaClient } from '@prisma/client';
import { CreateContactInput, UpdateContactInput } from '@dosc-syspro/contracts/contact';
import { normalizePhone, normalizeCpf } from '@dosc-syspro/shared';
import { normalizeCompanyIds, serializeContact } from '@dosc-syspro/contacts-domain';

export class ContactsOrchestrationService {
  constructor(
    private readonly prisma: PrismaClient | any,
    private readonly chatwoot: ChatwootClientPort,
    private readonly evolution: EvolutionClientPort
  ) {}

  async createContact(input: CreateContactInput, requesterContext: any) {
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new Error('Nome do contato obrigatorio');
    }

    const whatsapp = normalizePhone(input.whatsapp) || null;
    const phone = normalizePhone(input.phone) || null;
    const cpf = normalizeCpf(input.cpf) || null;
    if (cpf && cpf.length !== 11) {
      throw new Error('CPF deve conter 11 digitos.');
    }
    
    const jobTitle = input.jobTitle?.trim() || null;
    const companyIds = normalizeCompanyIds(input.companyIds);
    
    // Authorization check should be done before calling this, or passed as a callback
    if (requesterContext.assertCompanyIdsAllowed) {
      await requesterContext.assertCompanyIdsAllowed(companyIds);
    }

    const existing = whatsapp
      ? await this.prisma.companyContact.findFirst({
          where: { whatsapp },
          include: this.getContactInclude(),
        })
      : null;

    if (existing) {
      if (requesterContext.assertContactManageable) {
        await requesterContext.assertContactManageable(existing);
      }

      const updated = await this.prisma.$transaction(
        async (tx: any) => {
          const updatedContact = await tx.companyContact.update({
            where: { id: existing.id },
            data: {
              name,
              email: input.email?.trim() || null,
              phone,
              cpf,
              jobTitle,
            },
          });

          await this.syncCompanyLinks(tx, existing.id, companyIds, requesterContext.role);
          return tx.companyContact.findUnique({
            where: { id: existing.id },
            include: this.getContactInclude(),
          });
        },
        { timeout: 15000 },
      );

      return serializeContact(updated);
    }

    const created = await this.prisma.$transaction(
      async (tx: any) => {
        const newContact = await tx.companyContact.create({
          data: {
            name,
            whatsapp,
            phone,
            email: input.email?.trim() || null,
            cpf,
            jobTitle,
            source: 'PORTAL',
          },
        });

        await this.syncCompanyLinks(tx, newContact.id, companyIds, requesterContext.role);
        return tx.companyContact.findUnique({
          where: { id: newContact.id },
          include: this.getContactInclude(),
        });
      },
      { timeout: 15000 },
    );

    return serializeContact(created);
  }

  private async syncCompanyLinks(tx: any, contactId: string, companyIds: string[], role: string) {
    if (role !== 'SYSTEM') {
      const currentLinks = await tx.contactCompanyLink.findMany({
        where: { contactId },
      });
      const currentCompanyIds = currentLinks.map((l: any) => l.companyId);

      const toRemove = currentCompanyIds.filter((id: string) => !companyIds.includes(id));
      const toAdd = companyIds.filter((id: string) => !currentCompanyIds.includes(id));

      if (toRemove.length) {
        await tx.contactCompanyLink.deleteMany({
          where: { contactId, companyId: { in: toRemove } },
        });
      }

      if (toAdd.length) {
        await tx.contactCompanyLink.createMany({
          data: toAdd.map((companyId: string) => ({
            contactId,
            companyId,
          })),
          skipDuplicates: true,
        });
      }

      if (toRemove.length || toAdd.length) {
        const remaining = await tx.contactCompanyLink.findMany({
          where: { contactId },
          orderBy: { createdAt: 'asc' },
        });

        if (remaining.length > 0) {
          await tx.contactCompanyLink.updateMany({
            where: { contactId, companyId: remaining[0].companyId },
            data: { isPrimary: true },
          });
          if (remaining.length > 1) {
            await tx.contactCompanyLink.updateMany({
              where: { contactId, companyId: { in: remaining.slice(1).map((r: any) => r.companyId) } },
              data: { isPrimary: false },
            });
          }
        }
      }
    }
  }

  private getContactInclude() {
    return {
      companyLinks: {
        include: {
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              observacoes: true,
              serverType: true,
              serverPort: true,
              serverHost: true,
              serverProtocol: true,
              iisIsapiPath: true,
              installationDirectory: true,
              remoteConnections: true,
              addresses: { select: { cidade: true, pais: true }, take: 1 },
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    };
  }
}
