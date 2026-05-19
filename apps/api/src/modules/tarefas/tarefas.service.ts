import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type {
  TaskConfigUpsertInput,
  TaskConfigView,
  TaskCompanyItem,
  TaskItem,
  TaskStatus,
  TaskHistoryItem,
  TaskItemListQuery,
  TaskItemListResponse,
  TaskContactOption,
  TaskListQuery,
  TaskListResponse,
  TaskSendManualRequestInput,
  TaskSendManualRequestResult,
  TaskSyncCompetenciesInput,
  TaskSyncCompetenciesResult,
  TaskUpdateStatusInput,
  TaskUpdateStatusResult,
  CreateTaskInput,
  CreateTaskResult,
} from '@dosc-syspro/contracts/tarefas';
import {
  CompanyStatus,
  Prisma,
  Role,
} from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { EvolutionClient, EvolutionOutboundError } from '../integrations/evolution/evolution.client';
import { IntegrationContextService } from '../settings/integration-context.service';
import { AutomationSettingsService } from '../automation/automation-settings.service';
import { AutomationWhatsappService } from '../automation/automation-whatsapp.service';
import { TarefasSettingsService } from './tarefas-settings.service';

const DEFAULT_TASK_REQUIRED_DOCUMENTS = [
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
const DEFAULT_TASK_DUE_DAY = 12;

@Injectable()
export class TarefasService {
  private readonly logger = new Logger(TarefasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContext: IntegrationContextService,
    private readonly evolutionClient: EvolutionClient,
    private readonly automationSettingsService: AutomationSettingsService,
    private readonly automationWhatsappService: AutomationWhatsappService,
    private readonly tarefasSettingsService: TarefasSettingsService,
  ) {}

  async list(input: TaskListQuery, rawHeaders?: IncomingHttpHeaders): Promise<TaskListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveViewScope(requester);
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
        taskConfig: {
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

    const normalizedItems: TaskCompanyItem[] = companies.map((company: any) => this.toCompanyItem(company));
    const filteredItems = statusFilter
      ? normalizedItems.filter((item: TaskCompanyItem) => item.candidateStatus === statusFilter)
      : normalizedItems;
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        totalCompanies: normalizedItems.length,
        withAccountingFirm: normalizedItems.filter((item: TaskCompanyItem) => Boolean(item.accountingFirmId)).length,
        readyToConfigure: normalizedItems.filter((item: TaskCompanyItem) => item.candidateStatus === 'READY_TO_CONFIGURE').length,
        missingAccountingFirm: normalizedItems.filter((item: TaskCompanyItem) => item.candidateStatus === 'NO_ACCOUNTING_FIRM').length,
        missingPrimaryContact: normalizedItems.filter((item: TaskCompanyItem) => item.candidateStatus === 'NO_PRIMARY_CONTACT').length,
      },
    };
  }

  async getCompanyConfig(companyId: string, rawHeaders?: IncomingHttpHeaders): Promise<TaskConfigView> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveViewScope(requester);
    await this.assertCompanyInScope(companyId, scope);

    const company = await this.getCompanyContext(companyId);
    const configModel = (this.prisma as any).taskConfig;
    const existingConfig = await configModel.findUnique({
      where: { companyId },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
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
        dueDay: existingConfig?.dueDay ?? DEFAULT_TASK_DUE_DAY,
        reminderDays: existingConfig?.reminderDays ?? 3,
        clientContactId: existingConfig?.clientContactId ?? null,
        accountingContactId: existingConfig?.accountingContactId ?? null,
        assignedToId: existingConfig?.assignedToId ?? null,
        assignedToName: existingConfig?.assignedTo?.name ?? null,
        notes: existingConfig?.notes ?? null,
        requiredDocuments: this.getRequiredDocumentsOrDefault(existingConfig?.requiredDocuments),
      },
      clientContacts: this.toContactOptions(company.contactLinks),
      accountingContacts: this.toContactOptions(company.accountingFirm?.contactLinks ?? []),
    };
  }

  async upsertCompanyConfig(input: TaskConfigUpsertInput, rawHeaders?: IncomingHttpHeaders): Promise<{ success: boolean; message: string }> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveManageScope(requester);
    await this.assertCompanyInScope(input.companyId, scope);

    const company = await this.getCompanyContext(input.companyId);
    const clientContactId = this.normalizeOptionalString(input.data.clientContactId);
    const accountingContactId = this.normalizeOptionalString(input.data.accountingContactId);
    const assignedToId = this.normalizeOptionalString(input.data.assignedToId);
    await this.assertAssignableTaskOwner(assignedToId);

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

    const configModel = (this.prisma as any).taskConfig;
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
        assignedToId,
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
        assignedToId,
        notes: this.normalizeOptionalString(input.data.notes),
        requiredDocuments: input.data.requiredDocuments,
      },
    });

    if (input.data.isActive) {
      const { year, month } = this.resolveYearMonth();
      await this.ensureCompetenciesForScope(
        { isGlobal: false, companyIds: [input.companyId] },
        year,
        month,
      );
    }

    return { success: true, message: 'Configuração da rotina mensal salva com sucesso.' };
  }

  async createTask(input: CreateTaskInput, rawHeaders?: IncomingHttpHeaders): Promise<CreateTaskResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveManageScope(requester);
    await this.assertCompanyInScope(input.companyId, scope);
    await this.assertAssignableTaskOwner(this.normalizeOptionalString(input.assignedToId));

    const taskModel = (this.prisma as any).task;

    const task = await taskModel.create({
      data: {
        type: 'TAREFA',
        companyId: input.companyId,
        title: input.title.trim(),
        description: this.normalizeOptionalString(input.description),
        dueDate: new Date(input.dueDate),
        clientContactId: this.normalizeOptionalString(input.clientContactId),
        assignedToId: this.normalizeOptionalString(input.assignedToId),
        requiredDocuments: input.requiredDocuments,
        notes: this.normalizeOptionalString(input.notes),
        status: 'PENDING',
      },
      include: this.getTaskListInclude(),
    });

    await this.createHistoryEntry({
      taskId: task.id,
      authorUserId: requester.userId,
      type: 'TASK_CREATED',
      title: 'Tarefa criada manualmente',
      description: input.description ?? null,
      metadata: { source: 'manual' },
    });

    return {
      success: true,
      message: 'Tarefa criada com sucesso.',
      task: this.toTaskItem(task),
    };
  }

  async createFromTicket(ticket: {
    id: string;
    subject: string | null;
    companyId: string | null;
    assignedUserId: string | null;
  }): Promise<void> {
    if (!ticket.companyId) return;

    const settings = await this.tarefasSettingsService.readModuleSettings();
    if (!settings.autoCreateOnTicketResolved) return;

    const companyName = await this.resolveCompanyDisplayName(ticket.companyId);

    const title = settings.autoTaskTitle
      .replace('{ticket_subject}', ticket.subject ?? 'Atendimento')
      .replace('{company_name}', companyName);

    const result = await this.createFollowUpTaskFromTicket({
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      companyId: ticket.companyId,
      assignedUserId: ticket.assignedUserId,
      title,
      dueDays: settings.autoTaskDueDays,
      assignToOwner: settings.autoTaskAssignToTicketOwner,
    });

    this.logger.log(`[ticket] tarefa criada automaticamente para ticket ${ticket.id} — empresa ${ticket.companyId}`);
  }

  async createFollowUpTaskFromTicket(
    input: {
      ticketId: string;
      ticketSubject: string | null;
      companyId: string;
      assignedUserId?: string | null;
      title: string;
      description?: string | null;
      dueDays: number;
      assignToOwner?: boolean;
      authorUserId?: string | null;
    },
    prismaClient: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ created: boolean; taskId?: string; skippedReason?: string }> {
    const taskModel = (prismaClient as any).task;
    const assignedToId = input.assignToOwner ? (input.assignedUserId ?? null) : null;
    await this.assertAssignableTaskOwner(assignedToId);
    const openTask = await taskModel.findFirst({
      where: {
        type: 'TAREFA',
        ticketId: input.ticketId,
        status: { in: ['PENDING', 'WAITING_CUSTOMER', 'RECEIVED', 'SENT_TO_ACCOUNTING', 'OVERDUE'] },
      },
      select: { id: true },
    });

    if (openTask) {
      return { created: false, skippedReason: 'existing_open_follow_up' };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.max(0, input.dueDays));

    const task = await taskModel.create({
      data: {
        type: 'TAREFA',
        companyId: input.companyId,
        title: input.title.trim(),
        description: this.normalizeOptionalString(input.description),
        ticketId: input.ticketId,
        assignedToId,
        dueDate,
        status: 'PENDING',
        requiredDocuments: [],
      },
    });

    await this.createHistoryEntry(
      {
        taskId: task.id,
        authorUserId: input.authorUserId ?? null,
        type: 'TASK_CREATED',
        title: 'Tarefa criada a partir do fechamento do ticket',
        description: input.ticketSubject?.trim()
          ? `Origem: ticket ${input.ticketId} - ${input.ticketSubject.trim()}`
          : `Origem: ticket ${input.ticketId}`,
        metadata: { source: 'ticket_finalize', ticketId: input.ticketId },
      },
      prismaClient,
    );

    return { created: true, taskId: task.id };
  }

  private async assertAssignableTaskOwner(userId?: string | null): Promise<void> {
    const normalizedUserId = this.normalizeOptionalString(userId);
    if (!normalizedUserId) return;

    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || user.isActive === false) {
      throw new BadRequestException('O responsavel informado nao esta disponivel para receber tarefas.');
    }

    const assignableRoles: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
    if (!assignableRoles.includes(user.role)) {
      throw new BadRequestException('A tarefa so pode ser atribuida para usuarios de Suporte, Desenvolvimento ou Admin.');
    }
  }

  async listTasks(
    input: TaskItemListQuery,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<TaskItemListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveViewScope(requester);
    const shouldApplyCompetenceFilter = input.type !== 'TAREFA';
    const { year, month } = shouldApplyCompetenceFilter
      ? this.resolveYearMonth(input.year, input.month)
      : { year: null, month: null };

    const statusFilter = input.status && input.status !== 'ALL' ? (input.status as TaskStatus) : undefined;
    const typeFilter = input.type && input.type !== 'ALL' ? input.type : undefined;
    const search = input.search?.trim().toLowerCase();
    const page = this.parsePage(input.page);
    const pageSize = this.parsePageSize(input.pageSize);
    const taskModel = (this.prisma as any).task;
    const scopeWhere = scope.isGlobal ? {} : { companyId: { in: scope.companyIds } };

    const includesMonthlyTasks = typeFilter !== 'TAREFA';

    // Lightweight inline overdue marking for ROTINA_MENSAL
    if (includesMonthlyTasks && year && month) {
      const overdueWhere = { year, month, type: 'ROTINA_MENSAL', status: 'PENDING', dueDate: { lt: new Date() }, ...scopeWhere };
      const overdueToMark: Array<{ id: string }> = await taskModel.findMany({
        where: overdueWhere,
        select: { id: true },
      });

      if (overdueToMark.length > 0) {
        await taskModel.updateMany({ where: overdueWhere, data: { status: 'OVERDUE' } });
        await Promise.all(
          overdueToMark.map((record: { id: string }) =>
            this.createHistoryEntry({
              taskId: record.id,
              type: 'AUTO_OVERDUE',
              fromStatus: 'PENDING',
              toStatus: 'OVERDUE',
              title: 'Tarefa marcada como atrasada automaticamente',
              description: 'A data de vencimento passou sem que os documentos fossem recebidos.',
              metadata: { rule: 'inline_overdue_check' },
            }),
          ),
        );
      }
    }

    const listWhere: any = {
      ...(typeFilter ? { type: typeFilter } : {}),
      ...scopeWhere,
    };

    const records = await taskModel.findMany({
      where: listWhere,
      include: this.getTaskListInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const normalizedItems: TaskItem[] = records.map((record: any) => this.toTaskItem(record));
    const competenceScopedItems = normalizedItems.filter((item: TaskItem) => {
      if (item.type !== 'ROTINA_MENSAL') return true;
      if (!includesMonthlyTasks) return false;
      if (year == null || month == null) return true;
      return item.year === year && item.month === month;
    });
    const searchedItems = search
      ? competenceScopedItems.filter((item: TaskItem) =>
          [
            item.companyName,
            item.accountingFirmName ?? '',
            item.title,
            item.description ?? '',
            item.clientContactName ?? '',
            item.accountingContactName ?? '',
            item.lastManualRequestContactName ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(search),
        )
      : competenceScopedItems;
    const openStatuses: TaskStatus[] = ['PENDING', 'WAITING_CUSTOMER', 'RECEIVED', 'SENT_TO_ACCOUNTING', 'OVERDUE'];
    const filteredItems = statusFilter
      ? searchedItems.filter((item: TaskItem) => item.status === statusFilter)
      : searchedItems.filter((item: TaskItem) => openStatuses.includes(item.status));
    const openItems = competenceScopedItems.filter((item: TaskItem) => openStatuses.includes(item.status));
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        total: openItems.length,
        pending: competenceScopedItems.filter((item: TaskItem) => item.status === 'PENDING').length,
        waitingCustomer: competenceScopedItems.filter((item: TaskItem) => item.status === 'WAITING_CUSTOMER').length,
        received: competenceScopedItems.filter((item: TaskItem) => item.status === 'RECEIVED').length,
        sentToAccounting: competenceScopedItems.filter((item: TaskItem) => item.status === 'SENT_TO_ACCOUNTING').length,
        completed: competenceScopedItems.filter((item: TaskItem) => item.status === 'COMPLETED').length,
        overdue: competenceScopedItems.filter((item: TaskItem) => item.status === 'OVERDUE').length,
      },
      year: typeFilter === 'TAREFA' ? null : year,
      month: typeFilter === 'TAREFA' ? null : month,
    };
  }

  async getTask(id: string, rawHeaders?: IncomingHttpHeaders): Promise<TaskItem> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveViewScope(requester);
    const taskModel = (this.prisma as any).task;

    const record = await taskModel.findFirst({
      where: { id },
      include: this.getTaskDetailInclude(),
    });

    if (!record) {
      throw new BadRequestException('Tarefa não encontrada.');
    }

    await this.assertCompanyInScope(record.companyId, scope);

    return this.toTaskItem(record);
  }

  async syncCompetencies(
    input: TaskSyncCompetenciesInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<TaskSyncCompetenciesResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveManageScope(requester);
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
    input: TaskSendManualRequestInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<TaskSendManualRequestResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveManageScope(requester);
    const taskModel = (this.prisma as any).task;
    const requestModel = (this.prisma as any).taskRequest;

    const task = await taskModel.findFirst({
      where: { id: input.taskId },
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
                  select: { id: true, name: true, email: true, phone: true, whatsapp: true },
                },
              },
            },
          },
        },
        config: {
          select: { title: true, requiredDocuments: true },
        },
      },
    });

    if (!task) {
      throw new BadRequestException('Tarefa não encontrada.');
    }

    await this.assertCompanyInScope(task.companyId, scope);

    const availableContacts = this.toContactOptions(task.company?.contactLinks ?? []);
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
      companyName: task.company?.nomeFantasia || task.company?.razaoSocial || 'empresa',
      title: task.config?.title || task.title || 'Tarefa',
      year: task.year ?? new Date().getFullYear(),
      month: task.month ?? new Date().getMonth() + 1,
      requiredDocuments: this.normalizeRequiredDocuments(task.config?.requiredDocuments ?? task.requiredDocuments),
      template: input.template,
    });

    const contexts = await this.integrationContext.listActiveContexts({ companyIds: [task.companyId] });
    const context = contexts[0] ?? null;
    if (!context) {
      throw new BadRequestException('Nenhuma conexão Evolution ativa encontrada para realizar o disparo.');
    }

    const nextAttemptNumber = (await requestModel.count({ where: { taskId: task.id } })) + 1;

    try {
      const sendResult = await this.evolutionClient.sendTextMessage(context.evolution, targetPhone, message);
      const now = new Date();
      const requestRecord = await requestModel.create({
        data: {
          taskId: task.id,
          companyId: task.companyId,
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
        taskId: task.id,
        authorUserId: requester.userId,
        type: 'MANUAL_REQUEST_SENT',
        fromStatus: task.status as TaskStatus,
        toStatus: task.status === 'PENDING' || task.status === 'OVERDUE' ? 'WAITING_CUSTOMER' : (task.status as TaskStatus),
        title: `Solicitação enviada para ${selectedContact.name}`,
        description: message,
        metadata: { requestId: requestRecord.id, attemptNumber: nextAttemptNumber, contactId: selectedContact.id, targetPhone, template: input.template ?? null },
      });

      await taskModel.update({
        where: { id: task.id },
        data: {
          requestedAt: now,
          status: task.status === 'PENDING' || task.status === 'OVERDUE' ? 'WAITING_CUSTOMER' : task.status,
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
          taskId: task.id,
          companyId: task.companyId,
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

  async updateTaskStatus(
    input: TaskUpdateStatusInput,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<TaskUpdateStatusResult> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveManageScope(requester);
    const taskModel = (this.prisma as any).task;

    const existing = await taskModel.findFirst({
      where: { id: input.taskId },
      include: this.getTaskListInclude(),
    });

    if (!existing) {
      throw new BadRequestException('Tarefa não encontrada.');
    }

    await this.assertCompanyInScope(existing.companyId, scope);

    const nextStatus = input.status as TaskStatus;
    const previousStatus = existing.status as TaskStatus;
    const notes = this.normalizeOptionalString(input.notes);

    if (previousStatus === 'CANCELED') {
      throw new BadRequestException('Uma tarefa cancelada não pode ter seu status alterado.');
    }
    if (nextStatus === previousStatus) {
      throw new BadRequestException(`A tarefa já está com status "${this.getStatusLabel(previousStatus)}".`);
    }
    if (nextStatus === 'CANCELED') {
      const cancelableFrom: ReadonlyArray<TaskStatus> = ['PENDING', 'OVERDUE', 'WAITING_CUSTOMER', 'RECEIVED'];
      if (!cancelableFrom.includes(previousStatus)) {
        throw new BadRequestException(
          `Não é possível cancelar uma tarefa com status "${this.getStatusLabel(previousStatus)}".`,
        );
      }
    }

    const now = new Date();
    const updateData: Record<string, unknown> = { status: nextStatus, notes };

    if (nextStatus === 'WAITING_CUSTOMER' && !existing.requestedAt) updateData.requestedAt = now;
    if (nextStatus === 'RECEIVED' && !existing.receivedAt) updateData.receivedAt = now;
    if (nextStatus === 'SENT_TO_ACCOUNTING' && !existing.sentAt) updateData.sentAt = now;
    if (nextStatus === 'COMPLETED' && !existing.completedAt) updateData.completedAt = now;

    await taskModel.update({ where: { id: existing.id }, data: updateData });

    await this.createHistoryEntry({
      taskId: existing.id,
      authorUserId: requester.userId,
      type: 'STATUS_CHANGED',
      fromStatus: previousStatus,
      toStatus: nextStatus,
      title: `Status alterado para ${this.getStatusLabel(nextStatus)}`,
      description: notes,
      metadata: { taskId: existing.id },
    });

    const refreshed = await taskModel.findFirst({
      where: { id: existing.id },
      include: this.getTaskListInclude(),
    });

    if (!refreshed) {
      throw new BadRequestException('Tarefa atualizada, mas não foi possível recarregar os dados.');
    }

    return {
      success: true,
      message: 'Status da tarefa atualizado com sucesso.',
      task: this.toTaskItem(refreshed),
    };
  }

  async runPeriodicJob(): Promise<void> {
    const { year, month } = this.resolveYearMonth();
    this.logger.log(`[job] iniciando ciclo periódico — competência ${String(month).padStart(2, '0')}/${year}`);
    await this.ensureCompetenciesForScope({ isGlobal: true, companyIds: [] }, year, month);
    await this.runMarkOverdueJob(year, month);
    await this.runReminderJob(year, month);
    this.logger.log(`[job] ciclo periódico concluído — competência ${String(month).padStart(2, '0')}/${year}`);
  }

  private toCompanyItem(company: {
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    status: CompanyStatus;
    regimeTributario: string | null;
    accountingFirmId: string | null;
    accountingFirm: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
    taskConfig?: { id: string; isActive: boolean } | null;
    contactLinks: Array<{ isPrimary: boolean; contact: { id: string; name: string; email: string | null } }>;
  }): TaskCompanyItem {
    const primaryContactLink = company.contactLinks.find((link) => link.isPrimary) ?? company.contactLinks[0] ?? null;
    const accountingFirmName = company.accountingFirm?.nomeFantasia || company.accountingFirm?.razaoSocial || null;
    let candidateStatus: TaskCompanyItem['candidateStatus'] = 'READY_TO_CONFIGURE';

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
      routineConfigId: company.taskConfig?.id ?? null,
      routineEnabled: company.taskConfig?.isActive ?? false,
      candidateStatus,
    };
  }

  private async resolveViewScope(requester: Awaited<ReturnType<AuthorizationService['getRequester']>>) {
    const canView =
      (await this.authorizationService.userHasPermission(requester, 'tarefas:view', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'tarefas:view_all', { acceptCompanyScope: true })) ||
      (await this.authorizationService.userHasPermission(requester, 'tarefas:manage', { acceptCompanyScope: true }));

    if (!canView) {
      throw new ForbiddenException('Sem permissão para acessar tarefas.');
    }

    const canViewAll = await this.authorizationService.userHasPermission(requester, 'tarefas:view_all');
    if (canViewAll) {
      return { isGlobal: true, companyIds: [] as string[] };
    }

    const taskScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tarefas:view',
      'tarefas:view_all',
    );

    if (taskScope.isGlobal || taskScope.companyIds.length > 0) {
      return taskScope;
    }

    const manageScope = await this.authorizationService.resolveCompanyAccessScope(
      requester,
      'tarefas:manage',
      'tarefas:view_all',
    );

    if (manageScope.isGlobal || manageScope.companyIds.length > 0) {
      return manageScope;
    }

    const fallbackCompanyIds = await this.authorizationService.getUserCompanyIds(requester);
    return { isGlobal: false, companyIds: fallbackCompanyIds };
  }

  private async resolveManageScope(requester: Awaited<ReturnType<AuthorizationService['getRequester']>>) {
    const canManage = await this.authorizationService.userHasPermission(requester, 'tarefas:manage', {
      acceptCompanyScope: true,
    });

    if (!canManage) {
      throw new ForbiddenException('Sem permissão para gerenciar tarefas.');
    }

    return this.authorizationService.resolveCompanyAccessScope(requester, 'tarefas:manage', 'tarefas:view_all');
  }

  private async assertCompanyInScope(companyId: string, scope: { isGlobal: boolean; companyIds: string[] }) {
    if (scope.isGlobal) return;
    if (!scope.companyIds.includes(companyId)) {
      throw new ForbiddenException('Empresa fora do escopo permitido para esta tarefa.');
    }
  }

  private async getCompanyContext(companyId: string) {
    const companyModel = this.prisma.company as any;
    const company = await companyModel.findFirst({
      where: { id: companyId, deletedAt: null },
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
                  select: { id: true, name: true, email: true, phone: true, whatsapp: true },
                },
              },
            },
          },
        },
        contactLinks: {
          select: {
            isPrimary: true,
            contact: {
              select: { id: true, name: true, email: true, phone: true, whatsapp: true },
            },
          },
        },
      },
    });

    if (!company) {
      throw new ForbiddenException('Empresa não encontrada.');
    }

    return company;
  }

  private getTaskListInclude() {
    return {
      _count: { select: { requests: true } },
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          contactLinks: {
            select: {
              isPrimary: true,
              contact: {
                select: { id: true, name: true, email: true, phone: true, whatsapp: true },
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
          clientContact: { select: { id: true, name: true } },
          accountingContact: { select: { id: true, name: true } },
          company: {
            select: {
              accountingFirm: { select: { razaoSocial: true, nomeFantasia: true } },
            },
          },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      requests: {
        include: this.getManualRequestInclude(),
        orderBy: [{ requestedAt: 'desc' }],
        take: 1,
      },
    };
  }

  private getTaskDetailInclude() {
    return {
      _count: { select: { requests: true } },
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          contactLinks: {
            select: {
              isPrimary: true,
              contact: {
                select: { id: true, name: true, email: true, phone: true, whatsapp: true },
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
          clientContact: { select: { id: true, name: true } },
          accountingContact: { select: { id: true, name: true } },
          company: {
            select: {
              accountingFirm: { select: { razaoSocial: true, nomeFantasia: true } },
            },
          },
        },
      },
      assignedTo: { select: { id: true, name: true } },
      requests: {
        include: this.getManualRequestInclude(),
        orderBy: [{ requestedAt: 'desc' }],
        take: 10,
      },
      history: {
        include: {
          authorUser: { select: { name: true, email: true } },
        },
        orderBy: [{ occurredAt: 'desc' }],
        take: 20,
      },
    };
  }

  private getManualRequestInclude() {
    return {
      contact: { select: { id: true, name: true } },
      requestedByUser: { select: { name: true, email: true } },
    };
  }

  private toContactOptions(contactLinks: Array<any>): TaskContactOption[] {
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
    return normalized.length > 0 ? normalized : DEFAULT_TASK_REQUIRED_DOCUMENTS;
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
      month: Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? Math.floor(parsedMonth) : now.getMonth() + 1,
    };
  }

  async ensureCompetenciesForScope(scope: { isGlobal: boolean; companyIds: string[] }, year: number, month: number) {
    const configModel = (this.prisma as any).taskConfig;
    const taskModel = (this.prisma as any).task;
    const configs = await configModel.findMany({
      where: {
        isActive: true,
        company: {
          deletedAt: null,
          status: { not: CompanyStatus.INACTIVE },
          ...(scope.isGlobal ? {} : { id: { in: scope.companyIds } }),
        },
      },
      include: { company: { select: { id: true } } },
    });

    const lastDayOfMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();

    const results = await Promise.all(
      configs.map(async (config: any) => {
        const resolvedDueDay = Math.min(config.dueDay, lastDayOfMonth);
        const dueDate = new Date(Date.UTC(year, month - 1, resolvedDueDay, 12, 0, 0));
        const existing = await taskModel.findUnique({
          where: { configId_year_month: { configId: config.id, year, month } },
        });

        if (!existing) {
          await taskModel.create({
            data: {
              type: 'ROTINA_MENSAL',
              configId: config.id,
              companyId: config.companyId,
              title: config.title || 'Rotina mensal',
              year,
              month,
              assignedToId: config.assignedToId ?? null,
              dueDate,
              status: dueDate < new Date() ? 'OVERDUE' : 'PENDING',
              requiredDocuments: [],
            },
          });
          return { generated: 1, updated: 0 };
        }

        if (
          existing.dueDate?.getTime?.() !== dueDate.getTime() ||
          (existing.assignedToId ?? null) !== (config.assignedToId ?? null)
        ) {
          await taskModel.update({
            where: { id: existing.id },
            data: {
              dueDate,
              assignedToId: config.assignedToId ?? null,
            },
          });
          return { generated: 0, updated: 1 };
        }

        return { generated: 0, updated: 0 };
      }),
    );

    const totals = results.reduce(
      (acc, r) => ({ generated: acc.generated + r.generated, updated: acc.updated + r.updated }),
      { generated: 0, updated: 0 },
    );

    if (totals.generated > 0 || totals.updated > 0) {
      this.logger.log(`[sync] ensureCompetenciesForScope — geradas: ${totals.generated}, atualizadas: ${totals.updated}`);
    }

    return totals;
  }

  private async runMarkOverdueJob(year: number, month: number): Promise<void> {
    this.logger.debug(`[job] runMarkOverdueJob — ${String(month).padStart(2, '0')}/${year}`);
    const taskModel = (this.prisma as any).task;
    const now = new Date();
    const automationSettings = await this.automationSettingsService.readAutomationModuleSettings();
    const { waitingCustomerTimeoutEnabled, waitingCustomerTimeoutHours } = automationSettings.monthlyRoutines;
    const waitingCustomerThreshold = new Date(now.getTime() - waitingCustomerTimeoutHours * 60 * 60 * 1000);

    const waitingOverdueCandidates = waitingCustomerTimeoutEnabled
      ? await taskModel.findMany({
          where: {
            type: 'ROTINA_MENSAL',
            year,
            month,
            status: 'WAITING_CUSTOMER',
            dueDate: { lt: now },
            updatedAt: { lte: waitingCustomerThreshold },
          },
          include: this.getTaskDetailInclude(),
        })
      : [];

    if (!waitingOverdueCandidates.length) {
      this.logger.debug('[job] runMarkOverdueJob — nenhum candidato para marcar como atrasado');
      return;
    }

    this.logger.log(`[job] runMarkOverdueJob — marcando ${waitingOverdueCandidates.length} tarefa(s) como OVERDUE`);

    await Promise.all(
      waitingOverdueCandidates.map(async (record: any) => {
        await taskModel.update({ where: { id: record.id }, data: { status: 'OVERDUE' } });

        await this.createHistoryEntry({
          taskId: record.id,
          type: 'AUTO_OVERDUE',
          fromStatus: 'WAITING_CUSTOMER',
          toStatus: 'OVERDUE',
          title: `Tarefa voltou para Atrasado após ${waitingCustomerTimeoutHours}h aguardando cliente`,
          description: 'A tarefa permaneceu aguardando cliente acima da janela automática configurada.',
          metadata: { rule: 'waiting_customer_timeout', waitingCustomerTimeoutHours },
        });

        await this.automationWhatsappService.sendMonthlyRoutineOverdueNotification({
          competencyId: record.id,
          companyId: record.companyId ?? null,
          companyName: record.company?.nomeFantasia || record.company?.razaoSocial || 'Empresa',
          routineTitle: record.config?.title || record.title || 'Rotina mensal',
          competencyLabel: record.year && record.month ? `${String(record.month).padStart(2, '0')}/${record.year}` : 'Tarefa',
          dueDate: record.dueDate.toLocaleDateString('pt-BR'),
          clientContactName: record.config?.clientContact?.name ?? null,
          timeoutHours: waitingCustomerTimeoutHours,
        });
      }),
    );
  }

  private async runReminderJob(year: number, month: number): Promise<void> {
    this.logger.debug(`[job] runReminderJob — ${String(month).padStart(2, '0')}/${year}`);
    const configModel = (this.prisma as any).taskConfig;
    const taskModel = (this.prisma as any).task;
    const historyModel = (this.prisma as any).taskHistory;

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const configs = await configModel.findMany({
      where: {
        isActive: true,
        reminderDays: { gt: 0 },
        clientContactId: { not: null },
      },
      include: {
        clientContact: { select: { id: true, name: true, phone: true, whatsapp: true } },
      },
    });

    await Promise.all(
      configs.map(async (config: any) => {
        const task = await taskModel.findUnique({
          where: { configId_year_month: { configId: config.id, year, month } },
          include: { company: { select: { id: true, razaoSocial: true, nomeFantasia: true } } },
        });

        if (!task || task.status !== 'PENDING') return;

        const reminderDate = new Date(task.dueDate);
        reminderDate.setUTCDate(reminderDate.getUTCDate() - config.reminderDays);
        if (now < reminderDate) return;

        const alreadySentToday = await historyModel.findFirst({
          where: { taskId: task.id, type: 'AUTO_REMINDER', occurredAt: { gte: todayStart } },
        });
        if (alreadySentToday) return;

        const contact = config.clientContact;
        const targetPhone = this.resolveContactOutboundPhone(contact);
        if (!targetPhone) return;

        const companyName = task.company?.nomeFantasia || task.company?.razaoSocial || 'empresa';
        const message = this.buildDefaultManualRequestMessage({
          contactName: contact.name,
          companyName,
          title: config.title || 'Rotina mensal',
          year,
          month,
          requiredDocuments: this.normalizeRequiredDocuments(config.requiredDocuments),
          template: 'FIRST_REMINDER',
        });

        const contexts = await this.integrationContext.listActiveContexts({ companyIds: [task.companyId] });
        const context = contexts[0] ?? null;
        if (!context) return;

        try {
          await this.evolutionClient.sendTextMessage(context.evolution, targetPhone, message);
        } catch {
          return;
        }

        await this.createHistoryEntry({
          taskId: task.id,
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

  private toTaskItem(record: any): TaskItem {
    const availableContacts = this.toContactOptions(record.company?.contactLinks ?? []);
    const manualRequests = Array.isArray(record.requests)
      ? record.requests.map((request: any) => this.toManualRequestItem(request))
      : [];
    const history = Array.isArray(record.history)
      ? record.history.map((entry: any) => this.toHistoryItem(entry))
      : [];
    const latestManualRequest = manualRequests[0] ?? null;
    const requiredDocuments = record.type === 'ROTINA_MENSAL'
      ? this.getRequiredDocumentsOrDefault(record.config?.requiredDocuments)
      : this.normalizeRequiredDocuments(record.requiredDocuments);
    const totalManualRequests = record._count?.requests ?? manualRequests.length;

    return {
      id: record.id,
      type: record.type ?? 'ROTINA_MENSAL',
      configId: record.configId ?? null,
      companyId: record.companyId,
      companyName: record.company?.nomeFantasia || record.company?.razaoSocial || 'Empresa',
      accountingFirmName:
        record.config?.company?.accountingFirm?.nomeFantasia ||
        record.config?.company?.accountingFirm?.razaoSocial ||
        null,
      title: record.title || record.config?.title || 'Tarefa',
      description: record.description ?? null,
      year: record.year ?? null,
      month: record.month ?? null,
      status: record.status,
      dueDate: record.dueDate instanceof Date ? record.dueDate.toISOString() : String(record.dueDate),
      requestedAt: record.requestedAt instanceof Date ? record.requestedAt.toISOString() : null,
      receivedAt: record.receivedAt instanceof Date ? record.receivedAt.toISOString() : null,
      sentAt: record.sentAt instanceof Date ? record.sentAt.toISOString() : null,
      completedAt: record.completedAt instanceof Date ? record.completedAt.toISOString() : null,
      clientContactId: record.config?.clientContact?.id ?? record.clientContactId ?? null,
      clientContactName: record.config?.clientContact?.name ?? null,
      accountingContactId: record.config?.accountingContact?.id ?? null,
      accountingContactName: record.config?.accountingContact?.name ?? null,
      assignedToId: record.assignedTo?.id ?? null,
      assignedToName: record.assignedTo?.name ?? null,
      ticketId: record.ticketId ?? null,
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

  private toHistoryItem(record: any): TaskHistoryItem {
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
    taskId: string;
    authorUserId?: string | null;
    type: string;
    fromStatus?: TaskStatus | null;
    toStatus?: TaskStatus | null;
    title: string;
    description?: string | null;
    metadata?: unknown;
  }, prismaClient: Prisma.TransactionClient | PrismaService = this.prisma) {
    const historyModel = (prismaClient as any).taskHistory;
    await historyModel.create({
      data: {
        taskId: input.taskId,
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

  private getStatusLabel(status: TaskStatus) {
    switch (status) {
      case 'PENDING': return 'Pendente';
      case 'WAITING_CUSTOMER': return 'Aguardando cliente';
      case 'RECEIVED': return 'Recebido';
      case 'SENT_TO_ACCOUNTING': return 'Enviado para contabilidade';
      case 'COMPLETED': return 'Concluído';
      case 'OVERDUE': return 'Atrasado';
      case 'CANCELED': return 'Cancelado';
      default: return status;
    }
  }

  private resolveContactOutboundPhone(contact: TaskContactOption) {
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
    const checklist = input.requiredDocuments.length > 0
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

  private async resolveCompanyDisplayName(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { nomeFantasia: true, razaoSocial: true },
    });

    return company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || companyId;
  }
}
