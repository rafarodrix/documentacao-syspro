import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type {
  MonthlyRoutineCompanyConfigUpsertInput,
  MonthlyRoutineCompanyConfigView,
  MonthlyRoutineCompanyItem,
  MonthlyRoutineCompetencyItem,
  MonthlyRoutineExecutionStatus,
  MonthlyRoutineHistoryItem,
  MonthlyRoutineCompetencyListQuery,
  MonthlyRoutineCompetencyListResponse,
  MonthlyRoutineContactOption,
  MonthlyRoutineListQuery,
  MonthlyRoutineListResponse,
  MonthlyRoutineSendManualRequestInput,
  MonthlyRoutineSendManualRequestResult,
  MonthlyRoutineSyncCompetenciesInput,
  MonthlyRoutineSyncCompetenciesResult,
  MonthlyRoutineUpdateCompetencyStatusInput,
  MonthlyRoutineUpdateCompetencyStatusResult,
} from '@dosc-syspro/contracts/rotinas-mensais';
import {
  CompanyStatus,
} from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { EvolutionClient, EvolutionOutboundError } from '../integrations/evolution/evolution.client';
import { IntegrationContextService } from '../settings/integration-context.service';
import { AutomationSettingsService } from '../automation/automation-settings.service';
import { AutomationWhatsappService } from '../automation/automation-whatsapp.service';

const DEFAULT_MONTHLY_ROUTINE_REQUIRED_DOCUMENTS = [
  'Sintegra',
  'Livro de entrada',
  'Livro de saida',
  'Relatorio de PIS e COFINS',
  'SPED Fiscal',
  'SPED Contribuicoes',
  'XML NF-e entrada',
  'XML NF-e saida',
  'XML NF-e CT-e',
];
const DEFAULT_MONTHLY_ROUTINE_DUE_DAY = 12;

@Injectable()
export class RotinasMensaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContext: IntegrationContextService,
    private readonly evolutionClient: EvolutionClient,
    private readonly automationSettingsService: AutomationSettingsService,
    private readonly automationWhatsappService: AutomationWhatsappService,
  ) {}

  async list(input: MonthlyRoutineListQuery, rawHeaders?: IncomingHttpHeaders): Promise<MonthlyRoutineListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    const { year, month } = this.resolveYearMonth();
    const page = this.parsePage(input.page);
    const pageSize = this.parsePageSize(input.pageSize);
    const search = input.search?.trim();
    const statusFilter = input.status && input.status !== 'ALL' ? input.status : undefined;
    const companyModel = this.prisma.company as any;

    if (!scope.isGlobal && scope.companyIds.length === 0) {
      return {
        items: [],
        pagination: buildPaginationMeta({ page, pageSize, total: 0 }),
        summary: {
          totalCompanies: 0,
          withAccountingFirm: 0,
          readyToConfigure: 0,
          missingAccountingFirm: 0,
          missingPrimaryContact: 0,
        },
      };
    }

    const where: any = {
      deletedAt: null,
      status: { not: CompanyStatus.INACTIVE },
      ...(scope.isGlobal ? {} : { id: { in: scope.companyIds } }),
      ...(search
        ? {
            OR: [
              { razaoSocial: { contains: search, mode: 'insensitive' } },
              { nomeFantasia: { contains: search, mode: 'insensitive' } },
              { accountingFirm: { is: { razaoSocial: { contains: search, mode: 'insensitive' } } } },
              { accountingFirm: { is: { nomeFantasia: { contains: search, mode: 'insensitive' } } } },
              {
                contactLinks: {
                  some: {
                    contact: {
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const companies = await companyModel.findMany({
      where,
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        status: true,
        regimeTributario: true,
        accountingFirmId: true,
        accountingFirm: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
        monthlyRoutineConfig: {
          select: {
            id: true,
            isActive: true,
          },
        },
        contactLinks: {
          select: {
            isPrimary: true,
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
    });

    const normalizedItems: MonthlyRoutineCompanyItem[] = companies.map((company: any) => this.toRoutineItem(company));
    const filteredItems = statusFilter
      ? normalizedItems.filter((item: MonthlyRoutineCompanyItem) => item.candidateStatus === statusFilter)
      : normalizedItems;
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        totalCompanies: normalizedItems.length,
        withAccountingFirm: normalizedItems.filter((item: MonthlyRoutineCompanyItem) => Boolean(item.accountingFirmId)).length,
        readyToConfigure: normalizedItems.filter((item: MonthlyRoutineCompanyItem) => item.candidateStatus === 'READY_TO_CONFIGURE').length,
        missingAccountingFirm: normalizedItems.filter((item: MonthlyRoutineCompanyItem) => item.candidateStatus === 'NO_ACCOUNTING_FIRM').length,
        missingPrimaryContact: normalizedItems.filter((item: MonthlyRoutineCompanyItem) => item.candidateStatus === 'NO_PRIMARY_CONTACT').length,
      },
    };
  }

  async getCompanyConfig(companyId: string, rawHeaders?: IncomingHttpHeaders): Promise<MonthlyRoutineCompanyConfigView> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    await this.assertCompanyInScope(companyId, scope);

    const company = await this.getCompanyRoutineContext(companyId);
    const configModel = (this.prisma as any).monthlyRoutineConfig;
    const existingConfig = await configModel.findUnique({
      where: { companyId },
    });

    return {
      company: {
        companyId: company.id,
        companyName: company.nomeFantasia || company.razaoSocial,
        accountingFirmId: company.accountingFirmId ?? null,
        accountingFirmName: company.accountingFirm?.nomeFantasia || company.accountingFirm?.razaoSocial || null,
      },
      config: {
        id: existingConfig?.id ?? null,
        companyId,
        isActive: existingConfig?.isActive ?? false,
        title: existingConfig?.title ?? 'Envio mensal contabil',
        dueDay: existingConfig?.dueDay ?? DEFAULT_MONTHLY_ROUTINE_DUE_DAY,
        reminderDays: existingConfig?.reminderDays ?? 3,
        clientContactId: existingConfig?.clientContactId ?? null,
        accountingContactId: existingConfig?.accountingContactId ?? null,
        notes: existingConfig?.notes ?? null,
        requiredDocuments: this.getRequiredDocumentsOrDefault(existingConfig?.requiredDocuments),
      },
      clientContacts: this.toContactOptions(company.contactLinks),
      accountingContacts: this.toContactOptions(company.accountingFirm?.contactLinks ?? []),
    };
  }

  async upsertCompanyConfig(input: MonthlyRoutineCompanyConfigUpsertInput, rawHeaders?: IncomingHttpHeaders): Promise<{ success: boolean; message: string }> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineManageScope(requester);
    await this.assertCompanyInScope(input.companyId, scope);

    const company = await this.getCompanyRoutineContext(input.companyId);
    const clientContactId = this.normalizeOptionalString(input.data.clientContactId);
    const accountingContactId = this.normalizeOptionalString(input.data.accountingContactId);

    if (clientContactId && !company.contactLinks.some((link: any) => link.contact.id === clientContactId)) {
      throw new ForbiddenException('O contato do cliente precisa estar vinculado a esta empresa.');
    }

    if (accountingContactId) {
      if (!company.accountingFirmId) {
        throw new ForbiddenException('Não existe escritório contábil vinculado para associar este contato.');
      }

      const isValidAccountingContact = (company.accountingFirm?.contactLinks ?? []).some(
        (link: any) => link.contact.id === accountingContactId,
      );

      if (!isValidAccountingContact) {
        throw new ForbiddenException('O contato contábil precisa estar vinculado ao escritório contábil selecionado.');
      }
    }

    const configModel = (this.prisma as any).monthlyRoutineConfig;
    await configModel.upsert({
      where: { companyId: input.companyId },
      create: {
        companyId: input.companyId,
        isActive: input.data.isActive,
        title: input.data.title.trim(),
        dueDay: input.data.dueDay,
        reminderDays: input.data.reminderDays,
        clientContactId,
        accountingContactId,
        notes: this.normalizeOptionalString(input.data.notes),
        requiredDocuments: input.data.requiredDocuments,
      },
      update: {
        isActive: input.data.isActive,
        title: input.data.title.trim(),
        dueDay: input.data.dueDay,
        reminderDays: input.data.reminderDays,
        clientContactId,
        accountingContactId,
        notes: this.normalizeOptionalString(input.data.notes),
        requiredDocuments: input.data.requiredDocuments,
      },
    });

    if (input.data.isActive) {
      const { year, month } = this.resolveYearMonth();
      await this.ensureCompetenciesForScope(
        {
          isGlobal: false,
          companyIds: [input.companyId],
        },
        year,
        month,
      );
    }

    return {
      success: true,
      message: 'Configuração da rotina mensal salva com sucesso.',
    };
  }

  async listCompetencies(
    input: MonthlyRoutineCompetencyListQuery,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<MonthlyRoutineCompetencyListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    const { year, month } = this.resolveYearMonth(input.year, input.month);

    const statusFilter = input.status && input.status !== 'ALL' ? (input.status as MonthlyRoutineExecutionStatus) : undefined;
    const search = input.search?.trim().toLowerCase();
    const page = this.parsePage(input.page);
    const pageSize = this.parsePageSize(input.pageSize);
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const scopeWhere = scope.isGlobal ? {} : { companyId: { in: scope.companyIds } };

    // Lightweight inline overdue marking: PENDING → OVERDUE when dueDate has passed.
    // Full overdue processing (WAITING_CUSTOMER timeout, history, notifications) runs via job.
    await competencyModel.updateMany({
      where: {
        year,
        month,
        status: 'PENDING',
        dueDate: { lt: new Date() },
        ...scopeWhere,
      },
      data: { status: 'OVERDUE' },
    });

    const records = await competencyModel.findMany({
      where: { year, month, ...scopeWhere },
      include: this.getCompetencyListInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const normalizedItems: MonthlyRoutineCompetencyItem[] = records.map((record: any) => this.toCompetencyItem(record));
    const searchedItems = search
      ? normalizedItems.filter((item: MonthlyRoutineCompetencyItem) =>
          [
            item.companyName,
            item.accountingFirmName ?? '',
            item.title,
            item.clientContactName ?? '',
            item.accountingContactName ?? '',
            item.lastManualRequestContactName ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(search),
        )
      : normalizedItems;
    const filteredItems = statusFilter
      ? searchedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === statusFilter)
      : searchedItems;
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        total: normalizedItems.length,
        pending: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'PENDING').length,
        waitingCustomer: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'WAITING_CUSTOMER').length,
        received: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'RECEIVED').length,
        sentToAccounting: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'SENT_TO_ACCOUNTING').length,
        completed: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'COMPLETED').length,
        overdue: normalizedItems.filter((item: MonthlyRoutineCompetencyItem) => item.status === 'OVERDUE').length,
      },
      year,
      month,
    };
  }

  async getCompetency(id: string, rawHeaders?: IncomingHttpHeaders): Promise<MonthlyRoutineCompetencyItem> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;

    const record = await competencyModel.findFirst({
      where: { id },
      include: this.getCompetencyDetailInclude(),
    });

    if (!record) {
      throw new BadRequestException('Competência da rotina mensal não encontrada.');
    }

    await this.assertCompanyInScope(record.companyId, scope);

    return this.toCompetencyItem(record);
  }

  async syncCompetencies(
    input: MonthlyRoutineSyncCompetenciesInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<MonthlyRoutineSyncCompetenciesResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineManageScope(requester);
    const { year, month } = this.resolveYearMonth(
      input.year ? String(input.year) : undefined,
      input.month ? String(input.month) : undefined,
    );
    const result = await this.ensureCompetenciesForScope(scope, year, month);

    return {
      success: true,
      message: 'Competências sincronizadas com sucesso.',
      generated: result.generated,
      updated: result.updated,
      year,
      month,
    };
  }

  async sendManualRequest(
    input: MonthlyRoutineSendManualRequestInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<MonthlyRoutineSendManualRequestResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineManageScope(requester);
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const requestModel = (this.prisma as any).monthlyRoutineRequest;

    const competency = await competencyModel.findFirst({
      where: { id: input.competencyId },
      include: {
        company: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            contactLinks: {
              select: {
                isPrimary: true,
                contact: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    whatsapp: true,
                  },
                },
              },
            },
          },
        },
        config: {
          select: {
            title: true,
            requiredDocuments: true,
          },
        },
      },
    });

    if (!competency) {
      throw new BadRequestException('Competência da rotina mensal não encontrada.');
    }

    await this.assertCompanyInScope(competency.companyId, scope);

    const availableContacts = this.toContactOptions(competency.company?.contactLinks ?? []);
    const selectedContact = availableContacts.find((contact) => contact.id === input.contactId);
    if (!selectedContact) {
      throw new BadRequestException('O contato selecionado não pertence a esta empresa.');
    }

    const targetPhone = this.resolveContactOutboundPhone(selectedContact);
    if (!targetPhone) {
      throw new BadRequestException('O contato selecionado não possui WhatsApp ou telefone válido para envio.');
    }

    const message = input.message?.trim() || this.buildDefaultManualRequestMessage({
      contactName: selectedContact.name,
      companyName: competency.company?.nomeFantasia || competency.company?.razaoSocial || 'empresa',
      title: competency.config?.title || 'Rotina mensal',
      year: competency.year,
      month: competency.month,
      requiredDocuments: this.normalizeRequiredDocuments(competency.config?.requiredDocuments),
      template: input.template,
    });

    // Resolve Evolution context scoped to this company for correct instance selection.
    const contexts = await this.integrationContext.listActiveContexts({ companyIds: [competency.companyId] });
    const context = contexts[0] ?? null;
    if (!context) {
      throw new BadRequestException('Nenhuma conexão Evolution ativa encontrada para realizar o disparo.');
    }

    const nextAttemptNumber = (await requestModel.count({
      where: {
        competencyId: competency.id,
      },
    })) + 1;

    try {
      const sendResult = await this.evolutionClient.sendTextMessage(context.evolution, targetPhone, message);
      const now = new Date();
      const requestRecord = await requestModel.create({
        data: {
          competencyId: competency.id,
          companyId: competency.companyId,
          contactId: selectedContact.id,
          requestedByUserId: requester.userId,
          attemptNumber: nextAttemptNumber,
          channel: 'WHATSAPP',
          status: 'SENT',
          targetPhone,
          message,
          providerMessageId: sendResult.messageId ?? null,
          providerConnectionKey: context.connectionKey,
          requestedAt: now,
          sentAt: now,
        },
        include: this.getManualRequestInclude(),
      });
      await this.createHistoryEntry({
        competencyId: competency.id,
        authorUserId: requester.userId,
        type: 'MANUAL_REQUEST_SENT',
        fromStatus: competency.status as MonthlyRoutineExecutionStatus,
        toStatus:
          competency.status === 'PENDING' || competency.status === 'OVERDUE'
            ? 'WAITING_CUSTOMER'
            : (competency.status as MonthlyRoutineExecutionStatus),
        title: `Solicitação enviada para ${selectedContact.name}`,
        description: message,
        metadata: {
          requestId: requestRecord.id,
          attemptNumber: nextAttemptNumber,
          contactId: selectedContact.id,
          targetPhone,
          template: input.template ?? null,
        },
      });

      await competencyModel.update({
        where: { id: competency.id },
        data: {
          requestedAt: now,
          status:
            competency.status === 'PENDING' || competency.status === 'OVERDUE'
              ? 'WAITING_CUSTOMER'
              : competency.status,
        },
      });

      return {
        success: true,
        message: 'Solicitação enviada e registrada com sucesso.',
        request: this.toManualRequestItem(requestRecord),
      };
    } catch (error: any) {
      const now = new Date();
      await requestModel.create({
        data: {
          competencyId: competency.id,
          companyId: competency.companyId,
          contactId: selectedContact.id,
          requestedByUserId: requester.userId,
          attemptNumber: nextAttemptNumber,
          channel: 'WHATSAPP',
          status: 'FAILED',
          targetPhone,
          message,
          providerConnectionKey: context.connectionKey,
          errorMessage: error instanceof Error ? error.message : 'Falha ao enviar solicitação manual.',
          requestedAt: now,
        },
      });

      if (error instanceof EvolutionOutboundError) {
        throw new BadRequestException(
          error.code === 'WHATSAPP_NUMBER_NOT_REGISTERED'
            ? 'O número informado não está registrado no WhatsApp.'
            : 'A Evolution rejeitou o disparo manual desta solicitação.',
        );
      }

      throw new BadRequestException('Não foi possível enviar a solicitação manual. O erro foi registrado.');
    }
  }

  async updateCompetencyStatus(
    input: MonthlyRoutineUpdateCompetencyStatusInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<MonthlyRoutineUpdateCompetencyStatusResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineManageScope(requester);
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;

    const existing = await competencyModel.findFirst({
      where: { id: input.competencyId },
      include: this.getCompetencyListInclude(),
    });

    if (!existing) {
      throw new BadRequestException('Competência da rotina mensal não encontrada.');
    }

    await this.assertCompanyInScope(existing.companyId, scope);

    const nextStatus = input.status as MonthlyRoutineExecutionStatus;
    const previousStatus = existing.status as MonthlyRoutineExecutionStatus;
    const notes = this.normalizeOptionalString(input.notes);

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      notes,
    };

    if (nextStatus === 'WAITING_CUSTOMER' && !existing.requestedAt) {
      updateData.requestedAt = now;
    }
    if (nextStatus === 'RECEIVED' && !existing.receivedAt) {
      updateData.receivedAt = now;
    }
    if (nextStatus === 'SENT_TO_ACCOUNTING' && !existing.sentAt) {
      updateData.sentAt = now;
    }
    if (nextStatus === 'COMPLETED' && !existing.completedAt) {
      updateData.completedAt = now;
    }

    await competencyModel.update({
      where: { id: existing.id },
      data: updateData,
    });

    await this.createHistoryEntry({
      competencyId: existing.id,
      authorUserId: requester.userId,
      type: 'STATUS_CHANGED',
      fromStatus: previousStatus,
      toStatus: nextStatus,
      title: `Status alterado para ${this.getStatusLabel(nextStatus)}`,
      description: notes,
      metadata: {
        competencyId: existing.id,
      },
    });

    const refreshed = await competencyModel.findFirst({
      where: { id: existing.id },
      include: this.getCompetencyListInclude(),
    });

    if (!refreshed) {
      throw new BadRequestException('Competência atualizada, mas não foi possível recarregar os dados.');
    }

    return {
      success: true,
      message: 'Status da competência atualizado com sucesso.',
      competency: this.toCompetencyItem(refreshed),
    };
  }

  // Called by RotinasMensaisJobService on each tick.
  async runPeriodicJob(): Promise<void> {
    const { year, month } = this.resolveYearMonth();
    await this.ensureCompetenciesForScope({ isGlobal: true, companyIds: [] }, year, month);
    await this.runMarkOverdueJob(year, month);
    await this.runReminderJob(year, month);
  }

  private toRoutineItem(company: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    status: CompanyStatus;
    regimeTributario: string | null;
    accountingFirmId: string | null;
    accountingFirm: {
      id: string;
      razaoSocial: string;
      nomeFantasia: string | null;
    } | null;
    monthlyRoutineConfig?: {
      id: string;
      isActive: boolean;
    } | null;
    contactLinks: Array<{
      isPrimary: boolean;
      contact: {
        id: string;
        name: string;
        email: string | null;
      };
    }>;
  }): MonthlyRoutineCompanyItem {
    const primaryContactLink = company.contactLinks.find((link) => link.isPrimary) ?? company.contactLinks[0] ?? null;
    const accountingFirmName = company.accountingFirm?.nomeFantasia || company.accountingFirm?.razaoSocial || null;
    let candidateStatus: MonthlyRoutineCompanyItem['candidateStatus'] = 'READY_TO_CONFIGURE';

    if (!company.accountingFirmId) {
      candidateStatus = 'NO_ACCOUNTING_FIRM';
    } else if (!primaryContactLink?.contact?.id) {
      candidateStatus = 'NO_PRIMARY_CONTACT';
    }

    return {
      companyId: company.id,
      companyName: company.razaoSocial,
      companyTradeName: company.nomeFantasia,
      companyStatus: company.status,
      taxRegime: company.regimeTributario,
      accountingFirmId: company.accountingFirmId,
      accountingFirmName,
      primaryContactId: primaryContactLink?.contact.id ?? null,
      primaryContactName: primaryContactLink?.contact.name ?? null,
      primaryContactEmail: primaryContactLink?.contact.email ?? null,
      contactsCount: company.contactLinks.length,
      routineConfigId: company.monthlyRoutineConfig?.id ?? null,
      routineEnabled: company.monthlyRoutineConfig?.isActive ?? false,
      candidateStatus,
    };
  }

  private async resolveRoutineViewScope(requester: Awaited<ReturnType<AuthorizationService['getRequester']>>) {
    const canView =
      (await this.authorizationService.userHasPermission(requester, 'rotinas_mensais:view', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'rotinas_mensais:view_all', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'rotinas_mensais:manage', { acceptCompanyScope: true }));

    if (!canView) {
      throw new ForbiddenException('Sem permissão para acessar rotinas mensais.');
    }

    const canViewAll = await this.authorizationService.userHasPermission(requester, 'rotinas_mensais:view_all');
    if (canViewAll) {
      return { isGlobal: true, companyIds: [] as string[] };
    }

    const routineScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'rotinas_mensais:view',
      'rotinas_mensais:view_all',
    );

    if (routineScope.isGlobal || routineScope.companyIds.length > 0) {
      return routineScope;
    }

    const manageScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'rotinas_mensais:manage',
      'rotinas_mensais:view_all',
    );

    if (manageScope.isGlobal || manageScope.companyIds.length > 0) {
      return manageScope;
    }

    const fallbackCompanyIds = await this.authorizationService.getUserCompanyIds(requester);
    return {
      isGlobal: false,
      companyIds: fallbackCompanyIds,
    };
  }

  private async resolveRoutineManageScope(requester: Awaited<ReturnType<AuthorizationService['getRequester']>>) {
    const canManage = await this.authorizationService.userHasPermission(requester, 'rotinas_mensais:manage', {
      acceptCompanyScope: true,
    });

    if (!canManage) {
      throw new ForbiddenException('Sem permissão para gerenciar rotinas mensais.');
    }

    return this.authorizationService.resolveCompanyAccessScope(
      requester,
      'rotinas_mensais:manage',
      'rotinas_mensais:view_all',
    );
  }

  private async assertCompanyInScope(companyId: string, scope: { isGlobal: boolean; companyIds: string[] }) {
    if (scope.isGlobal) return;
    if (!scope.companyIds.includes(companyId)) {
      throw new ForbiddenException('Empresa fora do escopo permitido para esta rotina mensal.');
    }
  }

  private async getCompanyRoutineContext(companyId: string) {
    const companyModel = this.prisma.company as any;
    const company = await companyModel.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        accountingFirmId: true,
        accountingFirm: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            contactLinks: {
              select: {
                isPrimary: true,
                contact: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    whatsapp: true,
                  },
                },
              },
            },
          },
        },
        contactLinks: {
          select: {
            isPrimary: true,
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                whatsapp: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      throw new ForbiddenException('Empresa não encontrada para configurar rotina mensal.');
    }

    return company;
  }

  // Light include for list operations: one recent request for status display, no history.
  private getCompetencyListInclude() {
    return {
      _count: {
        select: { requests: true },
      },
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          contactLinks: {
            select: {
              isPrimary: true,
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  whatsapp: true,
                },
              },
            },
          },
        },
      },
      config: {
        select: {
          id: true,
          title: true,
          notes: true,
          requiredDocuments: true,
          clientContact: {
            select: {
              id: true,
              name: true,
            },
          },
          accountingContact: {
            select: {
              id: true,
              name: true,
            },
          },
          company: {
            select: {
              accountingFirm: {
                select: {
                  razaoSocial: true,
                  nomeFantasia: true,
                },
              },
            },
          },
        },
      },
      requests: {
        include: this.getManualRequestInclude(),
        orderBy: [{ requestedAt: 'desc' }],
        take: 1,
      },
    };
  }

  // Full include for detail operations: all recent requests and history.
  private getCompetencyDetailInclude() {
    return {
      _count: {
        select: { requests: true },
      },
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          contactLinks: {
            select: {
              isPrimary: true,
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  whatsapp: true,
                },
              },
            },
          },
        },
      },
      config: {
        select: {
          id: true,
          title: true,
          notes: true,
          requiredDocuments: true,
          reminderDays: true,
          clientContact: {
            select: {
              id: true,
              name: true,
            },
          },
          accountingContact: {
            select: {
              id: true,
              name: true,
            },
          },
          company: {
            select: {
              accountingFirm: {
                select: {
                  razaoSocial: true,
                  nomeFantasia: true,
                },
              },
            },
          },
        },
      },
      requests: {
        include: this.getManualRequestInclude(),
        orderBy: [{ requestedAt: 'desc' }],
        take: 10,
      },
      history: {
        include: {
          authorUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ occurredAt: 'desc' }],
        take: 20,
      },
    };
  }

  private getManualRequestInclude() {
    return {
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
      requestedByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    };
  }

  private toContactOptions(contactLinks: Array<any>): MonthlyRoutineContactOption[] {
    return contactLinks
      .map((link) => link.contact)
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
      .map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        whatsapp: contact.whatsapp ?? null,
      }));
  }

  private normalizeRequiredDocuments(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  private getRequiredDocumentsOrDefault(value: unknown) {
    const normalized = this.normalizeRequiredDocuments(value);
    return normalized.length > 0 ? normalized : DEFAULT_MONTHLY_ROUTINE_REQUIRED_DOCUMENTS;
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveYearMonth(yearValue?: string, monthValue?: string) {
    const now = new Date();
    const parsedYear = Number(yearValue);
    const parsedMonth = Number(monthValue);
    return {
      year: Number.isFinite(parsedYear) && parsedYear >= 2000 ? Math.floor(parsedYear) : now.getFullYear(),
      month:
        Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
          ? Math.floor(parsedMonth)
          : now.getMonth() + 1,
    };
  }

  async ensureCompetenciesForScope(scope: { isGlobal: boolean; companyIds: string[] }, year: number, month: number) {
    const configModel = (this.prisma as any).monthlyRoutineConfig;
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const configs = await configModel.findMany({
      where: {
        isActive: true,
        company: {
          deletedAt: null,
          status: { not: CompanyStatus.INACTIVE },
          ...(scope.isGlobal ? {} : { id: { in: scope.companyIds } }),
        },
      },
      include: {
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    const lastDayOfMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

    const results = await Promise.all(
      configs.map(async (config: any) => {
        const resolvedDueDay = Math.min(config.dueDay, lastDayOfMonth);
        const dueDate = new Date(Date.UTC(year, month - 1, resolvedDueDay, 12, 0, 0));
        const existing = await competencyModel.findUnique({
          where: {
            configId_year_month: {
              configId: config.id,
              year,
              month,
            },
          },
        });

        if (!existing) {
          await competencyModel.create({
            data: {
              configId: config.id,
              companyId: config.companyId,
              year,
              month,
              dueDate,
              status: dueDate < new Date() ? 'OVERDUE' : 'PENDING',
            },
          });
          return { generated: 1, updated: 0 };
        }

        if (existing.dueDate?.getTime?.() !== dueDate.getTime()) {
          await competencyModel.update({
            where: { id: existing.id },
            data: { dueDate },
          });
          return { generated: 0, updated: 1 };
        }

        return { generated: 0, updated: 0 };
      }),
    );

    return results.reduce(
      (acc, r) => ({ generated: acc.generated + r.generated, updated: acc.updated + r.updated }),
      { generated: 0, updated: 0 },
    );
  }

  // Full overdue job: marks WAITING_CUSTOMER timeouts, creates history, sends notifications.
  private async runMarkOverdueJob(year: number, month: number): Promise<void> {
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const now = new Date();
    const automationSettings = await this.automationSettingsService.readAutomationModuleSettings();
    const { waitingCustomerTimeoutEnabled, waitingCustomerTimeoutHours } = automationSettings.monthlyRoutines;
    const waitingCustomerThreshold = new Date(now.getTime() - waitingCustomerTimeoutHours * 60 * 60 * 1000);

    const waitingOverdueCandidates = waitingCustomerTimeoutEnabled
      ? await competencyModel.findMany({
          where: {
            year,
            month,
            status: 'WAITING_CUSTOMER',
            dueDate: { lt: now },
            updatedAt: { lte: waitingCustomerThreshold },
          },
          include: this.getCompetencyDetailInclude(),
        })
      : [];

    if (!waitingOverdueCandidates.length) return;

    await Promise.all(
      waitingOverdueCandidates.map(async (record: any) => {
        await competencyModel.update({
          where: { id: record.id },
          data: { status: 'OVERDUE' },
        });

        await this.createHistoryEntry({
          competencyId: record.id,
          type: 'AUTO_OVERDUE',
          fromStatus: 'WAITING_CUSTOMER',
          toStatus: 'OVERDUE',
          title: `Rotina voltou para Atrasado após ${waitingCustomerTimeoutHours}h aguardando cliente`,
          description: 'A competência permaneceu aguardando cliente acima da janela automática configurada.',
          metadata: {
            rule: 'waiting_customer_timeout',
            waitingCustomerTimeoutHours,
          },
        });

        await this.automationWhatsappService.sendMonthlyRoutineOverdueNotification({
          competencyId: record.id,
          companyId: record.companyId ?? null,
          companyName: record.company?.nomeFantasia || record.company?.razaoSocial || 'Empresa',
          routineTitle: record.config?.title || 'Rotina mensal',
          competencyLabel: `${String(record.month).padStart(2, '0')}/${record.year}`,
          dueDate: record.dueDate.toLocaleDateString('pt-BR'),
          clientContactName: record.config?.clientContact?.name ?? null,
          timeoutHours: waitingCustomerTimeoutHours,
        });
      }),
    );
  }

  // Sends automated reminders for PENDING competencies approaching their due date.
  private async runReminderJob(year: number, month: number): Promise<void> {
    const configModel = (this.prisma as any).monthlyRoutineConfig;
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const historyModel = (this.prisma as any).monthlyRoutineHistory;

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const configs = await configModel.findMany({
      where: {
        isActive: true,
        reminderDays: { gt: 0 },
        clientContactId: { not: null },
      },
      include: {
        clientContact: {
          select: { id: true, name: true, phone: true, whatsapp: true },
        },
      },
    });

    await Promise.all(
      configs.map(async (config: any) => {
        const competency = await competencyModel.findUnique({
          where: { configId_year_month: { configId: config.id, year, month } },
          include: {
            company: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
          },
        });

        if (!competency || competency.status !== 'PENDING') return;

        const reminderDate = new Date(competency.dueDate);
        reminderDate.setUTCDate(reminderDate.getUTCDate() - config.reminderDays);
        if (now < reminderDate) return;

        const alreadySentToday = await historyModel.findFirst({
          where: {
            competencyId: competency.id,
            type: 'AUTO_REMINDER',
            occurredAt: { gte: todayStart },
          },
        });
        if (alreadySentToday) return;

        const contact = config.clientContact;
        const targetPhone = this.resolveContactOutboundPhone(contact);
        if (!targetPhone) return;

        const companyName = competency.company?.nomeFantasia || competency.company?.razaoSocial || 'empresa';
        const message = this.buildDefaultManualRequestMessage({
          contactName: contact.name,
          companyName,
          title: config.title || 'Rotina mensal',
          year,
          month,
          requiredDocuments: this.normalizeRequiredDocuments(config.requiredDocuments),
          template: 'FIRST_REMINDER',
        });

        const contexts = await this.integrationContext.listActiveContexts({ companyIds: [competency.companyId] });
        const context = contexts[0] ?? null;
        if (!context) return;

        try {
          await this.evolutionClient.sendTextMessage(context.evolution, targetPhone, message);
        } catch {
          return;
        }

        await this.createHistoryEntry({
          competencyId: competency.id,
          type: 'AUTO_REMINDER',
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          title: `Lembrete automático enviado para ${contact.name}`,
          description: message,
          metadata: { reminderDays: config.reminderDays, targetPhone },
        });
      }),
    );
  }

  private toCompetencyItem(record: any): MonthlyRoutineCompetencyItem {
    const availableContacts = this.toContactOptions(record.company?.contactLinks ?? []);
    const manualRequests = Array.isArray(record.requests)
      ? record.requests.map((request: any) => this.toManualRequestItem(request))
      : [];
    const history = Array.isArray(record.history)
      ? record.history.map((entry: any) => this.toHistoryItem(entry))
      : [];
    const latestManualRequest = manualRequests[0] ?? null;
    const requiredDocuments = this.getRequiredDocumentsOrDefault(record.config?.requiredDocuments);
    // Use _count from Prisma for total requests when only a subset is loaded.
    const totalManualRequests = record._count?.requests ?? manualRequests.length;

    return {
      id: record.id,
      configId: record.configId,
      companyId: record.companyId,
      companyName: record.company?.nomeFantasia || record.company?.razaoSocial || 'Empresa',
      accountingFirmName:
        record.config?.company?.accountingFirm?.nomeFantasia ||
        record.config?.company?.accountingFirm?.razaoSocial ||
        null,
      title: record.config?.title || 'Rotina mensal',
      year: record.year,
      month: record.month,
      status: record.status,
      dueDate: record.dueDate instanceof Date ? record.dueDate.toISOString() : String(record.dueDate),
      requestedAt: record.requestedAt instanceof Date ? record.requestedAt.toISOString() : null,
      receivedAt: record.receivedAt instanceof Date ? record.receivedAt.toISOString() : null,
      sentAt: record.sentAt instanceof Date ? record.sentAt.toISOString() : null,
      completedAt: record.completedAt instanceof Date ? record.completedAt.toISOString() : null,
      clientContactId: record.config?.clientContact?.id ?? null,
      clientContactName: record.config?.clientContact?.name ?? null,
      accountingContactId: record.config?.accountingContact?.id ?? null,
      accountingContactName: record.config?.accountingContact?.name ?? null,
      configNotes: record.config?.notes ?? null,
      requiredDocuments,
      requiredDocumentsCount: requiredDocuments.length,
      notes: record.notes ?? null,
      availableContacts,
      manualRequestsCount: totalManualRequests,
      lastManualRequestAt: latestManualRequest?.requestedAt ?? null,
      lastManualRequestStatus: latestManualRequest?.status ?? null,
      lastManualRequestContactName: latestManualRequest?.contactName ?? null,
      manualRequests,
      history,
    };
  }

  private toManualRequestItem(record: any) {
    return {
      id: record.id,
      attemptNumber: Math.max(1, Number(record.attemptNumber ?? 1)),
      contactId: record.contactId,
      contactName: record.contact?.name ?? 'Contato',
      requestedByUserName: record.requestedByUser?.name || record.requestedByUser?.email || 'Usuário',
      channel: record.channel,
      status: record.status,
      targetPhone: record.targetPhone,
      message: record.message,
      providerMessageId: record.providerMessageId ?? null,
      errorMessage: record.errorMessage ?? null,
      requestedAt: record.requestedAt instanceof Date ? record.requestedAt.toISOString() : String(record.requestedAt),
      sentAt: record.sentAt instanceof Date ? record.sentAt.toISOString() : null,
    };
  }

  private toHistoryItem(record: any): MonthlyRoutineHistoryItem {
    return {
      id: record.id,
      type: record.type,
      title: record.title,
      description: record.description ?? null,
      fromStatus: record.fromStatus ?? null,
      toStatus: record.toStatus ?? null,
      authorUserName: record.authorUser?.name || record.authorUser?.email || null,
      occurredAt: record.occurredAt instanceof Date ? record.occurredAt.toISOString() : String(record.occurredAt),
    };
  }

  private async createHistoryEntry(input: {
    competencyId: string;
    authorUserId?: string | null;
    type: string;
    fromStatus?: MonthlyRoutineExecutionStatus | null;
    toStatus?: MonthlyRoutineExecutionStatus | null;
    title: string;
    description?: string | null;
    metadata?: unknown;
  }) {
    const historyModel = (this.prisma as any).monthlyRoutineHistory;
    await historyModel.create({
      data: {
        competencyId: input.competencyId,
        authorUserId: input.authorUserId ?? null,
        type: input.type,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        title: input.title,
        description: input.description ?? null,
        metadata: input.metadata ?? null,
      },
    });
  }

  private getStatusLabel(status: MonthlyRoutineExecutionStatus) {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'WAITING_CUSTOMER':
        return 'Aguardando cliente';
      case 'RECEIVED':
        return 'Recebido';
      case 'SENT_TO_ACCOUNTING':
        return 'Enviado para contabilidade';
      case 'COMPLETED':
        return 'Concluído';
      case 'OVERDUE':
        return 'Atrasado';
      case 'CANCELED':
        return 'Cancelado';
      default:
        return status;
    }
  }

  private resolveContactOutboundPhone(contact: MonthlyRoutineContactOption) {
    return this.normalizePhone(contact.whatsapp) || this.normalizePhone(contact.phone);
  }

  private normalizePhone(value: string | null | undefined) {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits || null;
  }

  private buildDefaultManualRequestMessage(input: {
    contactName: string;
    companyName: string;
    title: string;
    year: number;
    month: number;
    requiredDocuments: string[];
    template?: 'REQUEST_CONFIRMATION' | 'FIRST_REMINDER' | 'SECOND_REMINDER';
  }) {
    const firstName = String(input.contactName || '').trim().split(/\s+/)[0] || 'Tudo bem';
    const competence = `${String(input.month).padStart(2, '0')}/${input.year}`;
    const checklist =
      input.requiredDocuments.length > 0
        ? ` Documentos esperados: ${input.requiredDocuments.join(', ')}.`
        : '';
    const template = input.template ?? 'REQUEST_CONFIRMATION';

    if (template === 'FIRST_REMINDER') {
      return `Olá, ${firstName}. Estamos retomando a solicitação da competência ${competence} da empresa ${input.companyName} (${input.title}).${checklist} Quando puder, nos confirme para seguirmos com a geração dos arquivos.`;
    }

    if (template === 'SECOND_REMINDER') {
      return `Olá, ${firstName}. Este é um novo lembrete sobre a competência ${competence} da empresa ${input.companyName} (${input.title}).${checklist} Precisamos da sua confirmação para concluir esta etapa e seguir com a contabilidade.`;
    }

    return `Olá, ${firstName}. Podemos gerar os arquivos da competência ${competence} da empresa ${input.companyName} (${input.title})?${checklist} Se estiver tudo certo, por favor nos confirme por aqui.`;
  }

  private parsePage(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }

  private parsePageSize(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), 100) : 20;
  }
}
