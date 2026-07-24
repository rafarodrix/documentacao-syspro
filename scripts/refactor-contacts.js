const fs = require('fs');
const path = require('path');

const orchestratorPath = path.join(__dirname, '../packages/features/contacts/infra/src/services/contacts-orchestration.service.ts');
const apiServicePath = path.join(__dirname, '../apps/api/src/modules/contacts/contacts.service.ts');

const orchestratorContent = `import { ChatwootClientPort, EvolutionClientPort, IntegrationContextPort } from '../ports/integration-clients.port';
import { PrismaClient } from '@prisma/client';
import { CreateContactInput, UpdateContactInput, ContactListQuery } from '@dosc-syspro/contracts/contact';
import { normalizePhone, normalizeCpf } from '@dosc-syspro/shared';
import { normalizeCompanyIds, serializeContact, extractCompanyIds, buildContactSearchWhere, buildContactSearchText, shouldPermanentlyDeleteInvalidContact, serializeContactListResponse, parsePage, parsePageSize, parseLegacyLimit, resolveChatwootContactCompanies, normalizeChatwootCompanySummary, formatCompanyDisplayName, formatChatwootPhoneNumber, formatDateAttribute, ChatwootCompanySummary, CompanyContactSource, CompanyContactStatus } from '@dosc-syspro/contacts-domain';

export class ContactsOrchestrationService {
  constructor(
    private readonly prisma: PrismaClient | any,
    private readonly chatwoot: ChatwootClientPort,
    private readonly evolution: EvolutionClientPort,
    private readonly integrationContext: IntegrationContextPort
  ) {}

  async getContacts(input: ContactListQuery, scope: { isGlobal: boolean, companyIds: string[] }) {
    const wantsPagination = input.page !== undefined || input.pageSize !== undefined;
    if (!scope.isGlobal && !scope.companyIds.length) {
      return wantsPagination
        ? serializeContactListResponse([], 1, parsePageSize(input.pageSize ?? input.limit), 0)
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

    const page = parsePage(input.page);
    const take = wantsPagination ? parsePageSize(input.pageSize ?? input.limit) : parseLegacyLimit(input.limit);
    const skip = wantsPagination ? (page - 1) * take : 0;

    const [contacts, total] = await Promise.all([
      this.prisma.companyContact.findMany({
        where,
        include: this.getContactInclude(),
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
      }),
      wantsPagination ? this.prisma.companyContact.count({ where }) : Promise.resolve(0),
    ]);

    const items = contacts.map((contact: any) => serializeContact(contact));
    return wantsPagination ? serializeContactListResponse(items, page, take, total) : items;
  }

  async getUnlinkedContacts(scope: { isGlobal: boolean }) {
    if (!scope.isGlobal) return [];

    const contacts = await this.prisma.companyContact.findMany({
      where: {
        status: { not: CompanyContactStatus.ARCHIVED },
        companyLinks: { none: {} },
      },
      include: this.getContactInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((contact: any) => serializeContact(contact));
  }

  async getContactStats(scope: { isGlobal: boolean, companyIds: string[] }) {
    if (!scope.isGlobal && !scope.companyIds.length) {
      return { all: 0, linked: 0, unlinked: 0, withEmail: 0, withPhone: 0 };
    }

    const baseWhere: any = {
      status: { not: CompanyContactStatus.ARCHIVED },
      ...(scope.isGlobal ? {} : { companyLinks: { some: { companyId: { in: scope.companyIds } } } }),
    };

    const [all, linked, unlinked, withEmail, withPhone] = await Promise.all([
      this.prisma.companyContact.count({ where: baseWhere }),
      this.prisma.companyContact.count({
        where: scope.isGlobal
          ? { status: { not: CompanyContactStatus.ARCHIVED }, companyLinks: { some: {} } }
          : baseWhere,
      }),
      scope.isGlobal
        ? this.prisma.companyContact.count({
            where: { status: { not: CompanyContactStatus.ARCHIVED }, companyLinks: { none: {} } },
          })
        : Promise.resolve(0),
      this.prisma.companyContact.count({ where: { ...baseWhere, email: { not: null } } }),
      this.prisma.companyContact.count({
        where: { ...baseWhere, OR: [{ whatsapp: { not: null } }, { phone: { not: null } }] },
      }),
    ]);

    return { all, linked, unlinked, withEmail, withPhone };
  }

  async getContactById(contactId: string, requesterContext: any) {
    const contact = await this.prisma.companyContact.findUnique({
      where: { id: contactId },
      include: this.getContactInclude(),
    });
    if (!contact) throw new Error('Contato nao encontrado');
    if (requesterContext.assertContactVisible) {
      await requesterContext.assertContactVisible(contact);
    }
    return serializeContact(contact);
  }

  async createContact(input: CreateContactInput, requesterContext: any) {
    const name = String(input.name ?? '').trim();
    if (!name) throw new Error('Nome do contato obrigatorio');

    const whatsapp = normalizePhone(input.whatsapp) || null;
    const phone = normalizePhone(input.phone) || null;
    const cpf = normalizeCpf(input.cpf) || null;
    if (cpf && cpf.length !== 11) throw new Error('CPF deve conter 11 digitos.');
    
    const jobTitle = input.jobTitle?.trim() || null;
    const companyIds = normalizeCompanyIds(input.companyIds);
    
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

      const updated = await this.prisma.$transaction(async (tx: any) => {
        const updatedContact = await tx.companyContact.update({
          where: { id: existing.id },
          data: {
            name,
            email: input.email?.trim() || null,
            phone,
            cpf,
            jobTitle,
            whatsapp,
            notes: input.notes?.trim() || null,
            searchText: buildContactSearchText({ name, email: input.email?.trim() || null, phone, cpf, jobTitle, whatsapp }),
            source: existing.source,
            status: companyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
          },
          include: this.getContactInclude(),
        });
        await this.syncCompanyLinks(tx, existing.id, companyIds, requesterContext.role);
        return tx.companyContact.findUnique({ where: { id: existing.id }, include: this.getContactInclude() });
      }, { timeout: 15000 });

      const serialized = serializeContact(updated);
      await this.syncChatwootContactPresentation(serialized);
      return serialized;
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const newContact = await tx.companyContact.create({
        data: {
          name, whatsapp, phone, email: input.email?.trim() || null, cpf, jobTitle,
          notes: input.notes?.trim() || null,
          searchText: buildContactSearchText({ name, email: input.email?.trim() || null, phone, cpf, jobTitle, whatsapp }),
          source: CompanyContactSource.MANUAL,
          status: companyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK,
        },
      });
      await this.syncCompanyLinks(tx, newContact.id, companyIds, requesterContext.role);
      return tx.companyContact.findUnique({ where: { id: newContact.id }, include: this.getContactInclude() });
    }, { timeout: 15000 });

    const serialized = serializeContact(created);
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  async updateContact(contactId: string, input: UpdateContactInput, requesterContext: any) {
    const existing = await this.prisma.companyContact.findUnique({
      where: { id: contactId },
      include: this.getContactInclude(),
    });
    if (!existing) throw new Error('Contato nao encontrado');
    if (requesterContext.assertContactManageable) {
      await requesterContext.assertContactManageable(existing);
    }

    const nextCompanyIds = input.companyIds !== undefined ? normalizeCompanyIds(input.companyIds) : extractCompanyIds(existing);
    if (requesterContext.assertCompanyIdsAllowed) {
      await requesterContext.assertCompanyIdsAllowed(nextCompanyIds);
    }

    const data: any = {};
    if (input.name !== undefined) data.name = String(input.name).trim() || existing.name;
    if (input.email !== undefined) data.email = input.email?.trim() || null;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    if (input.phone !== undefined) data.phone = normalizePhone(input.phone) || null;
    if (input.cpf !== undefined) {
      const cpf = normalizeCpf(input.cpf) || null;
      if (cpf && cpf.length !== 11) throw new Error('CPF deve conter 11 digitos.');
      data.cpf = cpf;
    }
    if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle?.trim() || null;
    if (input.whatsapp !== undefined) data.whatsapp = normalizePhone(input.whatsapp) || null;
    if (input.companyIds !== undefined) {
      data.status = nextCompanyIds.length ? CompanyContactStatus.LINKED : CompanyContactStatus.PENDING_LINK;
    }
    data.searchText = buildContactSearchText({
      name: data.name ?? existing.name, email: data.email ?? existing.email,
      phone: data.phone ?? existing.phone, cpf: data.cpf ?? existing.cpf,
      jobTitle: data.jobTitle ?? existing.jobTitle, whatsapp: data.whatsapp ?? existing.whatsapp,
    });

    const updated = await this.prisma.$transaction(async (tx: any) => {
      await tx.companyContact.update({ where: { id: contactId }, data });
      if (input.companyIds !== undefined) {
        await this.syncCompanyLinks(tx, contactId, nextCompanyIds, requesterContext.role);
      }
      return tx.companyContact.findUnique({ where: { id: contactId }, include: this.getContactInclude() });
    }, { timeout: 15000 });

    const serialized = serializeContact(updated);
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  async deleteContact(contactId: string, requesterContext: any) {
    const existing = await this.prisma.companyContact.findUnique({
      where: { id: contactId },
      include: {
        ...this.getContactInclude(),
        _count: {
          select: { conversations: true, authoredConversationMessages: true, userLinks: true, users: true },
        },
      },
    });
    if (!existing) throw new Error('Contato nao encontrado');
    if (requesterContext.assertContactManageable) {
      await requesterContext.assertContactManageable(existing);
    }

    if (shouldPermanentlyDeleteInvalidContact(existing)) {
      await this.prisma.$transaction(async (tx: any) => {
        if (existing.whatsapp) {
          const links = await tx.conversationLink.findMany({
            where: { whatsappNumber: existing.whatsapp },
            select: { chatwootConversationId: true },
          });
          const chatwootConversationIds = links.map((link: any) => link.chatwootConversationId).filter(Boolean);

          if (chatwootConversationIds.length) {
            await tx.messageLink.deleteMany({ where: { chatwootConversationId: { in: chatwootConversationIds } } });
          }
          await tx.conversationLink.deleteMany({ where: { whatsappNumber: existing.whatsapp } });
        }
        await tx.companyContact.delete({ where: { id: contactId } });
      });
      return { ...serializeContact(existing), deleted: true, deleteMode: 'permanent_invalid_contact' };
    }

    const archived = await this.prisma.companyContact.update({
      where: { id: contactId },
      data: { status: CompanyContactStatus.ARCHIVED },
      include: this.getContactInclude(),
    });
    const serialized = serializeContact(archived);
    await this.syncChatwootContactPresentation(serialized);
    return serialized;
  }

  private async syncCompanyLinks(tx: any, contactId: string, companyIds: string[], role: string) {
    await tx.companyContactCompanyLink.deleteMany({
      where: { contactId, companyId: { notIn: companyIds.length ? companyIds : ['__none__'] } },
    });
    if (!companyIds.length) {
      await tx.companyContact.update({ where: { id: contactId }, data: { status: CompanyContactStatus.PENDING_LINK } });
      return;
    }
    for (const [index, currentCompanyId] of companyIds.entries()) {
      await tx.companyContactCompanyLink.upsert({
        where: { contactId_companyId: { contactId, companyId: currentCompanyId } },
        create: { contactId, companyId: currentCompanyId, isPrimary: index === 0 },
        update: { isPrimary: index === 0 },
      });
    }
    await tx.companyContact.update({ where: { id: contactId }, data: { status: CompanyContactStatus.LINKED } });
  }

  private getContactInclude() {
    return {
      companyLinks: {
        include: {
          company: {
            select: {
              id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, observacoes: true,
              remoteConnections: true,
              addresses: { select: { cidade: true, pais: true }, take: 1 },
            },
          },
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    };
  }

  private async syncChatwootContactPresentation(updatedContact: any, companyOverride?: ChatwootCompanySummary | null) {
    try {
      if (!updatedContact.whatsapp) return;
      const links = await this.prisma.conversationLink.findMany({
        where: { whatsappNumber: updatedContact.whatsapp },
        include: {
          company: {
            select: {
              id: true, razaoSocial: true, nomeFantasia: true, cnpj: true, observacoes: true,
              remoteConnections: true,
              addresses: { select: { cidade: true, pais: true }, take: 1 },
            },
          },
        },
      });

      if (!links.length) return;

      for (const link of links) {
        if (!link.chatwootContactId) continue;
        const context = await this.integrationContext.resolveByConnectionKey(link.connectionKey);
        if (!context) continue;

        const companies = resolveChatwootContactCompanies(
          updatedContact, companyOverride, normalizeChatwootCompanySummary(link.company)
        );
        const primaryCompany = companies[0] ?? null;
        const primaryCompanyName = formatCompanyDisplayName(primaryCompany);
        const chatwootDisplayName = updatedContact.name + (primaryCompanyName ? \` - \${primaryCompanyName}\` : '');
        const primaryCompanyAddress = primaryCompany?.addresses?.[0] ?? null;
        const companyNames = companies.map(c => formatCompanyDisplayName(c)).filter(Boolean);
        const chatwootLastName = primaryCompanyName ? \`| \${primaryCompanyName}\` : null;
        const contactStatus = updatedContact.status ?? null;
        const isArchived = contactStatus === CompanyContactStatus.ARCHIVED;

        const customAttributes = {
          syspro_contact_id: updatedContact.id ?? null,
          syspro_contact_name: updatedContact.name,
          syspro_contact_status: contactStatus,
          syspro_contact_active: !isArchived,
          syspro_company_id: primaryCompany?.id ?? updatedContact.companyId ?? null,
          syspro_company_name: primaryCompanyName || null,
          syspro_company_cnpj: primaryCompany?.cnpj ?? null,
          syspro_company_count: companies.length,
          syspro_company_ids: companies.map(c => c.id).filter(Boolean).join(','),
          syspro_company_names: companyNames.join(' | ') || null,
        };

        await this.chatwoot.updateContact(context.chatwoot, link.chatwootContactId, {
          name: chatwootDisplayName,
          phone_number: formatChatwootPhoneNumber(updatedContact.whatsapp),
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
          await this.chatwoot.updateConversationCustomAttributes(
            context.chatwoot, link.chatwootConversationId,
            { syspro_contact_id: customAttributes.syspro_contact_id }
          );
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar no chatwoot', error);
    }
  }
}
`;

fs.writeFileSync(orchestratorPath, orchestratorContent);

// Thin down contacts.service.ts
const apiServiceContent = `import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactsOrchestrationService } from '@dosc-syspro/contacts-infra';
import type { ContactAdminView, ContactListQuery, CreateContactInput, UpdateContactInput } from '@dosc-syspro/contracts/contact';
import { Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { AuthorizationService } from '../authorization/authorization.service';
import { extractCompanyIds } from '@dosc-syspro/contacts-domain';

@Injectable()
export class ContactsService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly contactsOrchestrator: ContactsOrchestrationService,
  ) {}

  async getAdminView(rawHeaders?: IncomingHttpHeaders): Promise<ContactAdminView> {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    return { isGlobalView: scope.isGlobal };
  }

  async getContacts(input: ContactListQuery, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    return this.contactsOrchestrator.getContacts(input, scope);
  }

  async getUnlinkedContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    return this.contactsOrchestrator.getUnlinkedContacts(scope);
  }

  async getContactStats(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const scope = await this.resolveContactCompanyScope(requester);
    return this.contactsOrchestrator.getContactStats(scope);
  }

  async getContactById(contactId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanViewContacts(rawHeaders);
    const requesterContext = {
      assertContactVisible: async (contact: any) => await this.assertContactVisibleToRequester(requester, contact)
    };
    return this.contactsOrchestrator.getContactById(contactId, requesterContext);
  }

  async createContact(input: CreateContactInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanCreateContacts(rawHeaders);
    const requesterContext = {
      role: requester.role,
      assertCompanyIdsAllowed: async (companyIds: string[]) => await this.assertCompanyIdsAllowedForRequester(requester, companyIds),
      assertContactManageable: async (contact: any) => await this.assertContactManageableByRequester(requester, contact)
    };
    return this.contactsOrchestrator.createContact(input, requesterContext);
  }

  async updateContact(contactId: string, input: UpdateContactInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanEditContacts(rawHeaders);
    const requesterContext = {
      role: requester.role,
      assertCompanyIdsAllowed: async (companyIds: string[]) => await this.assertCompanyIdsAllowedForRequester(requester, companyIds),
      assertContactManageable: async (contact: any) => await this.assertContactManageableByRequester(requester, contact)
    };
    return this.contactsOrchestrator.updateContact(contactId, input, requesterContext);
  }

  async linkContactToCompany(contactId: string, companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanEditContacts(rawHeaders);
    const requesterContext = {
      role: requester.role,
      assertCompanyIdsAllowed: async (companyIds: string[]) => await this.assertCompanyIdsAllowedForRequester(requester, companyIds),
      assertContactManageable: async (contact: any) => await this.assertContactManageableByRequester(requester, contact)
    };
    // Re-use updateContact flow since it naturally handles link behavior
    return this.contactsOrchestrator.updateContact(contactId, { companyIds: [companyId] }, requesterContext);
  }

  async deleteContact(contactId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanDeleteContacts(rawHeaders);
    const requesterContext = {
      assertContactManageable: async (contact: any) => await this.assertContactManageableByRequester(requester, contact)
    };
    return this.contactsOrchestrator.deleteContact(contactId, requesterContext);
  }

  // Auth Helpers
  private async assertCanViewContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canView = await this.authorizationService.userHasPermission(requester, 'contacts:view', { acceptCompanyScope: true }) ||
                    await this.authorizationService.userHasPermission(requester, 'contacts:view_team', { acceptCompanyScope: true }) ||
                    await this.authorizationService.userHasPermission(requester, 'contacts:view_all');
    if (!canView) throw new ForbiddenException('Sem permissao para consultar contatos.');
    return requester;
  }

  private async assertCanCreateContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canCreate = await this.authorizationService.userHasPermission(requester, 'contacts:create', { acceptCompanyScope: true });
    if (!canCreate) throw new ForbiddenException('Sem permissao para cadastrar contatos.');
    return requester;
  }

  private async assertCanEditContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canEdit = await this.authorizationService.userHasPermission(requester, 'contacts:edit', { acceptCompanyScope: true });
    if (!canEdit) throw new ForbiddenException('Sem permissao para alterar contatos.');
    return requester;
  }

  private async assertCanDeleteContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canDelete = await this.authorizationService.userHasPermission(requester, 'contacts:delete', { acceptCompanyScope: true });
    if (!canDelete) throw new ForbiddenException('Sem permissao para excluir contatos.');
    return requester;
  }

  private async resolveContactCompanyScope(requester: { userId: string; role: Role; email: string }) {
    const primaryScope = await this.authorizationService.resolveCompanyAccessScope(requester, 'contacts:view_team', 'contacts:view_all');
    if (primaryScope.isGlobal || primaryScope.companyIds.length > 0) return primaryScope;
    const canViewScoped = await this.authorizationService.userHasPermission(requester, 'contacts:view', { acceptCompanyScope: true });
    if (!canViewScoped) return primaryScope;
    return this.authorizationService.resolveCompanyAccessScope(requester, 'contacts:view', 'contacts:view_all');
  }

  private async assertCompanyIdsAllowedForRequester(requester: { userId: string; role: Role; email: string }, companyIds: string[]) {
    if (this.authorizationService.isSystemRole(requester.role)) return;
    if (requester.role !== Role.CLIENTE_ADMIN) throw new ForbiddenException('Sem permissao para vincular contatos a empresas.');
    if (!companyIds.length) throw new BadRequestException('Contato precisa estar vinculado a uma empresa permitida.');
    const allowedCompanyIds = await this.authorizationService.getManagedCompanyIds(requester.userId);
    if (companyIds.some((id) => !allowedCompanyIds.includes(id))) throw new ForbiddenException('Contato informado nao pertence a uma empresa permitida.');
  }

  private async assertContactVisibleToRequester(requester: { userId: string; role: Role; email: string }, contact: any) {
    if (this.authorizationService.isSystemRole(requester.role)) return;
    const scope = await this.resolveContactCompanyScope(requester);
    const contactCompanyIds = extractCompanyIds(contact);
    if (contactCompanyIds.some((companyId) => scope.companyIds.includes(companyId))) return;
    throw new NotFoundException('Contato nao encontrado');
  }

  private async assertContactManageableByRequester(requester: { userId: string; role: Role; email: string }, contact: any) {
    if (this.authorizationService.isSystemRole(requester.role)) return;
    const scope = await this.resolveContactCompanyScope(requester);
    const contactCompanyIds = extractCompanyIds(contact);
    if (contactCompanyIds.length && contactCompanyIds.every((companyId) => scope.companyIds.includes(companyId))) return;
    throw new ForbiddenException('Contato informado nao pertence integralmente ao seu escopo.');
  }
}
`;

fs.writeFileSync(apiServicePath, apiServiceContent);
console.log('Arquivos refatorados com sucesso!');
