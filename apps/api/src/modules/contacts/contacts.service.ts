import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type { ContactListQuery } from '@dosc-syspro/contracts/contact';
import { CompanyContactSource, CompanyContactStatus, Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionClient } from '../integrations/evolution/evolution.client';
import { ChatwootClient } from '../integrations/chatwoot/chatwoot.client';
import { IntegrationContextService } from '../settings/integration-context.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { buildContactSearchWhere } from '../shared/search/domain-search';

type CreateContactInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  jobTitle?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyId?: string | null;
  companyIds?: string[] | null;
};

type UpdateContactInput = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  jobTitle?: string | null;
  whatsapp?: string | null;
  notes?: string | null;
  companyId?: string | null;
  companyIds?: string[] | null;
};

const CONTACTS_TRANSACTION_TIMEOUT_MS = 15000;

type ChatwootCompanySummary = {
  id?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  addresses?: Array<{ cidade?: string | null; pais?: string | null }> | null;
};

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionClient: EvolutionClient,
    private readonly chatwootClient: ChatwootClient,
    private readonly integrationContext: IntegrationContextService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async getContacts(input: ContactListQuery, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    const wantsPagination = input.page !== undefined || input.pageSize !== undefined;
    if (!scope.isGlobal && !scope.companyIds.length) {
      return wantsPagination
        ? this.serializeContactListResponse([], 1, this.parsePageSize(input.pageSize ?? input.limit), 0)
        : [];
    }

    const q = input.q?.trim();
    const where: any = {
      status: { not: CompanyContactStatus.ARCHIVED },
    };

    if (!scope.isGlobal) {
      where.companyLinks = { some: { companyId: { in: scope.companyIds } } };
    } else if (input.unlinked === 'true') {
      where.companyLinks = { none: {} };
    } else if (input.unlinked === 'false') {
      where.companyLinks = { some: {} };
    } else if (input.companyId?.trim()) {
      where.companyLinks = { some: { companyId: input.companyId.trim() } };
    }

    if (q) {
      Object.assign(where, buildContactSearchWhere(q));
    }

    const page = this.parsePage(input.page);
    const take = wantsPagination ? this.parsePageSize(input.pageSize ?? input.limit) : this.parseLegacyLimit(input.limit);
    const skip = wantsPagination ? (page - 1) * take : 0;

    const [contacts, total] = await Promise.all([
      (this.prisma.companyContact as any).findMany({
        where,
        include: this.contactInclude(),
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
      }),
      wantsPagination ? (this.prisma.companyContact as any).count({ where }) : Promise.resolve(0),
    ]);

    const items = contacts.map((contact: any) => this.serializeContact(contact));
    return wantsPagination ? this.serializeContactListResponse(items, page, take, total) : items;
  }

  async getUnlinkedContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    if (!scope.isGlobal) return [];

    const contacts = await (this.prisma.companyContact as any).findMany({
      where: {
        status: { not: CompanyContactStatus.ARCHIVED },
        companyLinks: { none: {} },
      },
      include: this.contactInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contacts.map((contact: any) => this.serializeContact(contact));
  }

  async getContactStats(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);

    if (!scope.isGlobal && !scope.companyIds.length) {
      return {
        all: 0,
        linked: 0,
        unlinked: 0,
        withEmail: 0,
        withPhone: 0,
      };
    }

    const baseWhere: any = {
      status: { not: CompanyContactStatus.ARCHIVED },
      ...(scope.isGlobal
        ? {}
        : { companyLinks: { some: { companyId: { in: scope.companyIds } } } }),
    };

    const [all, linked, unlinked, withEmail, withPhone] = await Promise.all([
      (this.prisma.companyContact as any).count({ where: baseWhere }),
      (this.prisma.companyContact as any).count({
        where: scope.isGlobal
          ? { status: { not: CompanyContactStatus.ARCHIVED }, companyLinks: { some: {} } }
          : baseWhere,
      }),
      scope.isGlobal
        ? (this.prisma.companyContact as any).count({
            where: {
              status: { not: CompanyContactStatus.ARCHIVED },
              companyLinks: { none: {} },
            },
          })
        : Promise.resolve(0),
      (this.prisma.companyContact as any).count({
        where: {
          ...baseWhere,
          email: { not: null },
        },
      }),
      (this.prisma.companyContact as any).count({
        where: {
          ...baseWhere,
          OR: [
            { whatsapp: { not: null } },
            { phone: { not: null } },
          ],
        },
      }),
    ]);

    return {
      all,
      linked,
      unlinked,
      withEmail,
      withPhone,
    };
  }

  async getContactById(contactId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const contact = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');
    await this.assertContactVisibleToRequester(requester, contact);
    return this.serializeContact(contact);
  }

  async createContact(input: CreateContactInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanCreateContacts(rawHeaders);
    const name = String(input.name ?? '').trim();
    if (!name) {
      throw new BadRequestException('Nome do contato obrigatorio');
    }

    const whatsapp = this.normalizePhone(input.whatsapp);
    const phone = this.normalizePhone(input.phone);
    const cpf = this.normalizeCpf(input.cpf);
    if (cpf && cpf.length !== 11) {
      throw new BadRequestException('CPF deve conter 11 digitos.');
    }
    const jobTitle = input.jobTitle?.trim() || null;
    const companyIds = this.normalizeCompanyIds(input.companyIds, input.companyId);
    await this.assertCompanyIdsAllowedForRequester(requester, companyIds);
    const existing = whatsapp
      ? await (this.prisma.companyContact as any).findFirst({
          where: { whatsapp },
          include: this.contactInclude(),
        })
      : null;

    if (existing) {
      await this.assertContactManageableByRequester(requester, existing);

      const updated = await this.prisma.$transaction(
        async (tx) => {
          const updatedContact = await (tx.companyContact as any).update({
            where: { id: existing.id },
            data: {
              name,
              email: input.email?.trim() || null,
              phone,
              cpf,
              jobTitle,
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
      await this.syncChatwootContactPresentation(serialized);
      return serialized;
    }

    const created = await this.prisma.$transaction(
      async (tx) => {
        const createdContact = await (tx.companyContact as any).create({
          data: {
            name,
            email: input.email?.trim() || null,
            phone,
            cpf,
            jobTitle,
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
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  async updateContact(contactId: string, input: UpdateContactInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanEditContacts(rawHeaders);
    const existing = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!existing) throw new NotFoundException('Contato nao encontrado');
    await this.assertContactManageableByRequester(requester, existing);

    const nextCompanyIds = input.companyId !== undefined || input.companyIds !== undefined
      ? this.normalizeCompanyIds(input.companyIds, input.companyId)
      : this.extractCompanyIds(existing);
    await this.assertCompanyIdsAllowedForRequester(requester, nextCompanyIds);

    const data: any = {};
    if (input.name !== undefined) data.name = String(input.name).trim() || existing.name;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.phone !== undefined) data.phone = this.normalizePhone(input.phone);
    if (input.cpf !== undefined) {
      const cpf = this.normalizeCpf(input.cpf);
      if (cpf && cpf.length !== 11) {
        throw new BadRequestException('CPF deve conter 11 digitos.');
      }
      data.cpf = cpf;
    }
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle?.trim() || null;
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
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  async linkContactToCompany(contactId: string, companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanEditContacts(rawHeaders);
    const contact = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: this.contactInclude(),
    });
    if (!contact) throw new NotFoundException('Contato nao encontrado');
    await this.assertContactManageableByRequester(requester, contact);
    await this.assertCompanyIdsAllowedForRequester(requester, [companyId]);

    const nextCompanyIds = Array.from(new Set([companyId, ...this.extractCompanyIds(contact)]));
    return this.updateContact(contactId, { companyIds: nextCompanyIds }, rawHeaders);
  }

  async deleteContact(contactId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanDeleteContacts(rawHeaders);
    const existing = await (this.prisma.companyContact as any).findUnique({
      where: { id: contactId },
      include: {
        ...this.contactInclude(),
        _count: {
          select: {
            conversations: true,
            authoredConversationMessages: true,
            userLinks: true,
            users: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Contato nao encontrado');
    await this.assertContactManageableByRequester(requester, existing);

    if (this.shouldPermanentlyDeleteInvalidContact(existing)) {
      await this.prisma.$transaction(async (tx) => {
        if (existing.whatsapp) {
          const links = await (tx as any).conversationLink.findMany({
            where: { whatsappNumber: existing.whatsapp },
            select: { chatwootConversationId: true },
          });
          const chatwootConversationIds = links
            .map((link: any) => link.chatwootConversationId)
            .filter(Boolean);

          if (chatwootConversationIds.length) {
            await (tx as any).messageLink.deleteMany({
              where: { chatwootConversationId: { in: chatwootConversationIds } },
            });
          }

          await (tx as any).conversationLink.deleteMany({
            where: { whatsappNumber: existing.whatsapp },
          });
        }

        await (tx.companyContact as any).delete({
          where: { id: contactId },
        });
      });

      return {
        ...this.serializeContact(existing),
        deleted: true,
        deleteMode: 'permanent_invalid_contact',
      };
    }

    const archived = await (this.prisma.companyContact as any).update({
      where: { id: contactId },
      data: { status: CompanyContactStatus.ARCHIVED },
      include: this.contactInclude(),
    });

    const serialized = this.serializeContact(archived);
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  async syncFromIntegration(instanceName?: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanSyncContacts(rawHeaders);
    if (!this.authorizationService.isSystemRole(requester.role)) {
      throw new ForbiddenException('Sincronizacao de contatos permitida apenas para equipe interna.');
    }

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
    let skippedExistingCount = 0;

    for (const contact of contacts) {
      if (!contact.whatsapp) continue;

      const existing = await (this.prisma.companyContact as any).findFirst({
        where: { whatsapp: contact.whatsapp },
        include: this.contactInclude(),
      });

      if (existing) {
        skippedExistingCount += 1;
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
      `Sincronizacao Evolution concluida para ${context.evolution.instance}: ${syncedCount} contatos processados (${createdCount} novos, ${skippedExistingCount} existentes preservados).`
    );

    return {
      success: true,
      syncedCount,
      createdCount,
      updatedCount: 0,
      skippedExistingCount,
      mode: 'evolution_pull',
      message: `Sincronizacao concluida. ${createdCount} contatos novos e ${skippedExistingCount} existentes preservados.`,
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
              cnpj: true,
              addresses: {
                select: {
                  cidade: true,
                  pais: true,
                },
                take: 1,
              },
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

  private serializeContactListResponse(items: any[], page: number, pageSize: number, total: number) {
    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
    };
  }

  private parsePage(value?: string): number {
    const parsed = Number.parseInt(value || '1', 10);
    return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
  }

  private parsePageSize(value?: string): number {
    const parsed = Number.parseInt(value || '50', 10);
    return Math.min(100, Math.max(1, Number.isNaN(parsed) ? 50 : parsed));
  }

  private parseLegacyLimit(value?: string): number {
    const parsed = Number.parseInt(value || '50', 10);
    return Math.min(200, Math.max(1, Number.isNaN(parsed) ? 50 : parsed));
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

  async syncChatwootContactsForCompany(companyId: string) {
    const [company, contacts] = await Promise.all([
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnpj: true,
          addresses: {
            select: {
              cidade: true,
              pais: true,
            },
            take: 1,
          },
        },
      }),
      (this.prisma.companyContact as any).findMany({
        where: {
          status: { not: CompanyContactStatus.ARCHIVED },
          whatsapp: { not: null },
          companyLinks: { some: { companyId } },
        },
        include: this.contactInclude(),
      }),
    ]);

    for (const contact of contacts) {
      await this.syncChatwootContactPresentation(this.serializeContact(contact), company);
    }

    return contacts.length;
  }

  private async syncChatwootContactPresentation(updatedContact: {
    id?: string;
    name: string;
    email?: string | null;
    whatsapp: string | null;
    companyId?: string | null;
    company?: ChatwootCompanySummary | null;
    companies?: ChatwootCompanySummary[] | null;
    status?: CompanyContactStatus | string | null;
    updatedAt?: Date | string | null;
  }, companyOverride?: ChatwootCompanySummary | null) {
    try {
      if (!updatedContact.whatsapp) return;

      const links = await this.prisma.conversationLink.findMany({
        where: {
          whatsappNumber: updatedContact.whatsapp,
        },
        include: {
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
              cnpj: true,
              addresses: {
                select: {
                  cidade: true,
                  pais: true,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!links.length) {
        this.logger.warn(
          `Contato ${updatedContact.whatsapp} nao sincronizado no Chatwoot: nenhum conversationLink encontrado. A sincronizacao ocorre apos existir uma conversa vinculada no Chatwoot.`,
        );
        return;
      }

      for (const link of links) {
        if (!link.chatwootContactId) continue;
        const context = await this.integrationContext.resolveByConnectionKey(link.connectionKey);
        if (!context) {
          this.logger.warn(
            `Contato ${updatedContact.whatsapp} nao sincronizado no Chatwoot: contexto ${link.connectionKey} nao encontrado.`,
          );
          continue;
        }

        const companies = this.resolveChatwootContactCompanies(updatedContact, companyOverride, link.company);
        const primaryCompany = companies[0] ?? null;
        const primaryCompanyName = this.formatCompanyDisplayName(primaryCompany);
        const primaryCompanyAddress = primaryCompany?.addresses?.[0] ?? null;
        const companyNames = companies.map((company) => this.formatCompanyDisplayName(company)).filter(Boolean);
        const chatwootLastName = primaryCompanyName ? `| ${primaryCompanyName}` : null;
        const contactStatus = updatedContact.status ?? null;
        const isArchived = contactStatus === CompanyContactStatus.ARCHIVED;
        const customAttributes = {
          syspro_contact_id: updatedContact.id ?? null,
          syspro_contact_name: updatedContact.name,
          syspro_contact_status: contactStatus,
          syspro_contact_active: !isArchived,
          syspro_contact_archived_at: isArchived
            ? this.formatDateAttribute(updatedContact.updatedAt)
            : null,
          syspro_company_id: primaryCompany?.id ?? updatedContact.companyId ?? null,
          syspro_company_name: primaryCompanyName || null,
          syspro_company_legal_name: primaryCompany?.razaoSocial ?? null,
          syspro_company_trade_name: primaryCompany?.nomeFantasia ?? null,
          syspro_company_cnpj: primaryCompany?.cnpj ?? null,
          syspro_primary_company_id: primaryCompany?.id ?? updatedContact.companyId ?? null,
          syspro_primary_company_name: primaryCompanyName || null,
          syspro_company_count: companies.length,
          syspro_company_ids: companies.map((company) => company.id).filter(Boolean).join(','),
          syspro_company_names: companyNames.join(' | ') || null,
          syspro_companies: companies.map((company) => ({
            id: company.id ?? null,
            name: this.formatCompanyDisplayName(company) || null,
            legalName: company.razaoSocial ?? null,
            tradeName: company.nomeFantasia ?? null,
            cnpj: company.cnpj ?? null,
          })),
        };
        const conversationCustomAttributes = {
          syspro_contact_id: customAttributes.syspro_contact_id,
          syspro_contact_name: customAttributes.syspro_contact_name,
          syspro_contact_status: customAttributes.syspro_contact_status,
          syspro_contact_active: customAttributes.syspro_contact_active,
          syspro_company_id: customAttributes.syspro_company_id,
          syspro_company_name: customAttributes.syspro_company_name,
          syspro_company_cnpj: customAttributes.syspro_company_cnpj,
          syspro_company_count: customAttributes.syspro_company_count,
          syspro_company_names: customAttributes.syspro_company_names,
        };

        await this.chatwootClient.updateContact(context.chatwoot, link.chatwootContactId, {
          name: updatedContact.name,
          phone_number: this.formatChatwootPhoneNumber(updatedContact.whatsapp),
          ...(updatedContact.email ? { email: updatedContact.email } : {}),
          additional_attributes: {
            last_name: chatwootLastName,
            company_name: primaryCompanyName || null,
            city: primaryCompanyAddress?.cidade || null,
            country: primaryCompanyAddress?.pais || null,
          },
          custom_attributes: customAttributes,
        });

        if (link.chatwootConversationId) {
          await this.chatwootClient.updateConversationCustomAttributes(
            context.chatwoot,
            link.chatwootConversationId,
            conversationCustomAttributes,
          );
        }

        this.logger.log(JSON.stringify({
          flow: 'portal_to_chatwoot',
          stage: 'contact_presentation_synced',
          whatsapp: updatedContact.whatsapp,
          chatwootContactId: link.chatwootContactId,
          connectionKey: link.connectionKey,
          name: updatedContact.name,
          additionalAttributes: {
            last_name: chatwootLastName,
            company_name: primaryCompanyName || null,
            city: primaryCompanyAddress?.cidade || null,
            country: primaryCompanyAddress?.pais || null,
          },
          customAttributes,
          conversationCustomAttributes,
        }));
      }

      this.logger.log(`Contato ${updatedContact.whatsapp} sincronizado no Chatwoot com dados do portal.`);
    } catch (error: any) {
      this.logger.error(`Erro ao sincronizar contato no Chatwoot: ${error.message}`);
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

  private shouldPermanentlyDeleteInvalidContact(contact: any): boolean {
    const source = String(contact?.source ?? '').toUpperCase();
    if (source !== CompanyContactSource.WHATSAPP) return false;

    const hasCompanyLinks = Array.isArray(contact?.companyLinks) && contact.companyLinks.length > 0;
    if (hasCompanyLinks) return false;

    const count = contact?._count ?? {};
    const hasPortalHistory =
      Number(count.conversations ?? 0) > 0 ||
      Number(count.authoredConversationMessages ?? 0) > 0 ||
      Number(count.userLinks ?? 0) > 0 ||
      Number(count.users ?? 0) > 0;
    if (hasPortalHistory) return false;

    return this.isInvalidIntegrationPhone(contact?.whatsapp ?? contact?.phone);
  }

  private isInvalidIntegrationPhone(value?: string | null): boolean {
    const digits = this.normalizePhone(value);
    if (!digits) return true;

    if (digits.startsWith('55')) {
      return digits.length !== 12 && digits.length !== 13;
    }

    if (digits.startsWith('1')) {
      return digits.length !== 11;
    }

    return digits.length < 10 || digits.length > 15;
  }

  private formatChatwootPhoneNumber(value?: string | null): string | undefined {
    const digits = this.normalizePhone(value);
    return digits ? `+${digits}` : undefined;
  }

  private formatDateAttribute(value?: Date | string | null): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private resolveChatwootContactCompanies(
    updatedContact: {
      company?: ChatwootCompanySummary | null;
      companies?: ChatwootCompanySummary[] | null;
    },
    companyOverride?: ChatwootCompanySummary | null,
    linkCompany?: ChatwootCompanySummary | null,
  ) {
    const companies = [
      companyOverride,
      ...(updatedContact.companies ?? []),
      updatedContact.company,
      linkCompany,
    ].filter(Boolean) as ChatwootCompanySummary[];

    const seen = new Set<string>();
    return companies.filter((company) => {
      const key = String(company.id ?? company.cnpj ?? this.formatCompanyDisplayName(company) ?? '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private formatCompanyDisplayName(company?: { nomeFantasia?: string | null; razaoSocial?: string | null } | null) {
    return String(company?.nomeFantasia || company?.razaoSocial || '').trim();
  }

  private normalizeCpf(value?: string | null): string | null {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || null;
  }

  private async assertCanViewContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canView =
      await this.authorizationService.userHasPermission(requester, 'contacts:view', { acceptCompanyScope: true }) ||
      await this.authorizationService.userHasPermission(requester, 'contacts:view_team', { acceptCompanyScope: true }) ||
      await this.authorizationService.userHasPermission(requester, 'contacts:view_all');

    if (!canView) {
      throw new ForbiddenException('Sem permissao para consultar contatos.');
    }

    return requester;
  }

  private async assertCanCreateContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canCreate = await this.authorizationService.userHasPermission(requester, 'contacts:create', {
      acceptCompanyScope: true,
    });

    if (!canCreate) {
      throw new ForbiddenException('Sem permissao para cadastrar contatos.');
    }

    return requester;
  }

  private async assertCanEditContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canEdit = await this.authorizationService.userHasPermission(requester, 'contacts:edit', {
      acceptCompanyScope: true,
    });

    if (!canEdit) {
      throw new ForbiddenException('Sem permissao para alterar contatos.');
    }

    return requester;
  }

  private async assertCanDeleteContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canDelete = await this.authorizationService.userHasPermission(requester, 'contacts:delete', {
      acceptCompanyScope: true,
    });

    if (!canDelete) {
      throw new ForbiddenException('Sem permissao para excluir contatos.');
    }

    return requester;
  }

  private async assertCanSyncContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canSync = await this.authorizationService.userHasPermission(requester, 'contacts:sync');

    if (!canSync) {
      throw new ForbiddenException('Sem permissao para sincronizar contatos.');
    }

    return requester;
  }

  private async resolveContactCompanyScope(requester: { userId: string; role: Role; email: string }) {
    return this.authorizationService.resolveCompanyAccessScope(
      requester,
      'contacts:view_team',
      'contacts:view_all',
    );
  }

  private async assertCompanyIdsAllowedForRequester(
    requester: { userId: string; role: Role; email: string },
    companyIds: string[],
  ) {
    if (this.authorizationService.isSystemRole(requester.role)) return;
    if (requester.role !== Role.CLIENTE_ADMIN) {
      throw new ForbiddenException('Sem permissao para vincular contatos a empresas.');
    }

    if (!companyIds.length) {
      throw new BadRequestException('Contato precisa estar vinculado a uma empresa permitida.');
    }

    const allowedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
    if (companyIds.some((companyId) => !allowedCompanyIds.includes(companyId))) {
      throw new ForbiddenException('Contato informado nao pertence a uma empresa permitida.');
    }
  }

  private async assertContactVisibleToRequester(
    requester: { userId: string; role: Role; email: string },
    contact: any,
  ) {
    if (this.authorizationService.isSystemRole(requester.role)) return;

    const scope = await this.resolveContactCompanyScope(requester);
    const contactCompanyIds = this.extractCompanyIds(contact);
    if (contactCompanyIds.some((companyId) => scope.companyIds.includes(companyId))) return;

    throw new NotFoundException('Contato nao encontrado');
  }

  private async assertContactManageableByRequester(
    requester: { userId: string; role: Role; email: string },
    contact: any,
  ) {
    if (this.authorizationService.isSystemRole(requester.role)) return;

    const scope = await this.resolveContactCompanyScope(requester);
    const contactCompanyIds = this.extractCompanyIds(contact);
    if (
      contactCompanyIds.length &&
      contactCompanyIds.every((companyId) => scope.companyIds.includes(companyId))
    ) {
      return;
    }

    throw new ForbiddenException('Contato informado nao pertence integralmente ao seu escopo.');
  }

}
