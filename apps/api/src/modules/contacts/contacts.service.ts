import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
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

  async syncFromIntegration(instanceName?: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.assertCanSyncContacts(rawHeaders);
    if (!this.authorizationService.isSystemRole(requester.role)) {
      throw new ForbiddenException('Sincronizacao de contatos permitida apenas para equipe interna.');
    }
    return this.contactsOrchestrator.syncFromIntegration(instanceName, { role: requester.role });
  }

  async syncChatwootContactsForCompany(companyId: string) {
    // Esse método não usa rawHeaders (é disparado via webhook ou jobs)
    // O ideal seria que companies.service o chamasse via orchestrator, mas manteremos o pass-through para não quebrar a compilação
    return this.contactsOrchestrator.syncChatwootContactsForCompany(companyId);
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

  private async assertCanSyncContacts(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const canSync = await this.authorizationService.userHasPermission(requester, 'contacts:sync');
    if (!canSync) throw new ForbiddenException('Sem permissao para sincronizar contatos.');
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
