import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type {
  MonthlyRoutineCompanyConfigUpsertInput,
  MonthlyRoutineCompanyConfigView,
  MonthlyRoutineCompanyItem,
  MonthlyRoutineCompetencyItem,
  MonthlyRoutineCompetencyListQuery,
  MonthlyRoutineCompetencyListResponse,
  MonthlyRoutineContactOption,
  MonthlyRoutineListQuery,
  MonthlyRoutineListResponse,
  MonthlyRoutineSendManualRequestInput,
  MonthlyRoutineSendManualRequestResult,
  MonthlyRoutineSyncCompetenciesInput,
  MonthlyRoutineSyncCompetenciesResult,
} from '@dosc-syspro/contracts/rotinas-mensais';
import {
  CompanyStatus,
  MonthlyRoutineRequestStatus,
  MonthlyRoutineStatus,
} from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { EvolutionClient, EvolutionOutboundError } from '../integrations/evolution/evolution.client';
import { IntegrationContextService } from '../settings/integration-context.service';

@Injectable()
export class RotinasMensaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly integrationContext: IntegrationContextService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  async list(input: MonthlyRoutineListQuery, rawHeaders?: IncomingHttpHeaders): Promise<MonthlyRoutineListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    const { year, month } = this.resolveYearMonth();
    await this.ensureCompetenciesForScope(scope, year, month);
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

    const normalizedItems = companies.map((company) => this.toRoutineItem(company));
    const filteredItems = statusFilter
      ? normalizedItems.filter((item) => item.candidateStatus === statusFilter)
      : normalizedItems;
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        totalCompanies: normalizedItems.length,
        withAccountingFirm: normalizedItems.filter((item) => item.accountingFirmId).length,
        readyToConfigure: normalizedItems.filter((item) => item.candidateStatus === 'READY_TO_CONFIGURE').length,
        missingAccountingFirm: normalizedItems.filter((item) => item.candidateStatus === 'NO_ACCOUNTING_FIRM').length,
        missingPrimaryContact: normalizedItems.filter((item) => item.candidateStatus === 'NO_PRIMARY_CONTACT').length,
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
        dueDay: existingConfig?.dueDay ?? 5,
        reminderDays: existingConfig?.reminderDays ?? 3,
        clientContactId: existingConfig?.clientContactId ?? null,
        accountingContactId: existingConfig?.accountingContactId ?? null,
        notes: existingConfig?.notes ?? null,
        requiredDocuments: this.normalizeRequiredDocuments(existingConfig?.requiredDocuments),
      },
      clientContacts: this.toContactOptions(company.contactLinks),
      accountingContacts: this.toContactOptions(company.accountingFirm?.contactLinks ?? []),
    };
  }

  async upsertCompanyConfig(input: MonthlyRoutineCompanyConfigUpsertInput, rawHeaders?: IncomingHttpHeaders) {
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
        throw new ForbiddenException('Nao existe escritorio contabil vinculado para associar este contato.');
      }

      const isValidAccountingContact = (company.accountingFirm?.contactLinks ?? []).some(
        (link: any) => link.contact.id === accountingContactId,
      );

      if (!isValidAccountingContact) {
        throw new ForbiddenException('O contato contabil precisa estar vinculado ao escritorio contabil selecionado.');
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

    return {
      success: true,
      message: 'Configuracao da rotina mensal salva com sucesso.',
    };
  }

  async listCompetencies(
    input: MonthlyRoutineCompetencyListQuery,
    rawHeaders?: IncomingHttpHeaders,
  ): Promise<MonthlyRoutineCompetencyListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
    const { year, month } = this.resolveYearMonth(input.year, input.month);
    await this.ensureCompetenciesForScope(scope, year, month);

    const statusFilter = input.status && input.status !== 'ALL' ? (input.status as MonthlyRoutineStatus) : undefined;
    const search = input.search?.trim().toLowerCase();
    const page = this.parsePage(input.page);
    const pageSize = this.parsePageSize(input.pageSize);
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;

    const records = await competencyModel.findMany({
      where: {
        year,
        month,
        ...(scope.isGlobal ? {} : { companyId: { in: scope.companyIds } }),
      },
      include: this.getCompetencyListInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    await this.markOverdueCompetencies(records);

    const refreshedRecords = await competencyModel.findMany({
      where: {
        year,
        month,
        ...(scope.isGlobal ? {} : { companyId: { in: scope.companyIds } }),
      },
      include: this.getCompetencyListInclude(),
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });

    const normalizedItems = refreshedRecords.map((record: any) => this.toCompetencyItem(record));
    const searchedItems = search
      ? normalizedItems.filter((item) =>
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
    const filteredItems = statusFilter ? searchedItems.filter((item) => item.status === statusFilter) : searchedItems;
    const total = filteredItems.length;
    const start = (page - 1) * pageSize;
    const items = filteredItems.slice(start, start + pageSize);

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
      summary: {
        total: normalizedItems.length,
        pending: normalizedItems.filter((item) => item.status === 'PENDING').length,
        waitingCustomer: normalizedItems.filter((item) => item.status === 'WAITING_CUSTOMER').length,
        received: normalizedItems.filter((item) => item.status === 'RECEIVED').length,
        sentToAccounting: normalizedItems.filter((item) => item.status === 'SENT_TO_ACCOUNTING').length,
        completed: normalizedItems.filter((item) => item.status === 'COMPLETED').length,
        overdue: normalizedItems.filter((item) => item.status === 'OVERDUE').length,
      },
      year,
      month,
    };
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
      message: 'Competencias sincronizadas com sucesso.',
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
      throw new BadRequestException('Competencia da rotina mensal nao encontrada.');
    }

    await this.assertCompanyInScope(competency.companyId, scope);

    const availableContacts = this.toContactOptions(competency.company?.contactLinks ?? []);
    const selectedContact = availableContacts.find((contact) => contact.id === input.contactId);
    if (!selectedContact) {
      throw new BadRequestException('O contato selecionado nao pertence a esta empresa.');
    }

    const targetPhone = this.resolveContactOutboundPhone(selectedContact);
    if (!targetPhone) {
      throw new BadRequestException('O contato selecionado nao possui WhatsApp ou telefone valido para envio.');
    }

    const message = input.message?.trim() || this.buildDefaultManualRequestMessage({
      contactName: selectedContact.name,
      companyName: competency.company?.nomeFantasia || competency.company?.razaoSocial || 'empresa',
      title: competency.config?.title || 'Rotina mensal',
      year: competency.year,
      month: competency.month,
      requiredDocuments: this.normalizeRequiredDocuments(competency.config?.requiredDocuments),
    });

    const context = await this.integrationContext.getDefaultContext();
    if (!context) {
      throw new BadRequestException('Nenhuma conexao Evolution ativa encontrada para realizar o disparo.');
    }

    try {
      const sendResult = await this.evolutionClient.sendTextMessage(context.evolution, targetPhone, message);
      const now = new Date();
      const requestRecord = await requestModel.create({
        data: {
          competencyId: competency.id,
          companyId: competency.companyId,
          contactId: selectedContact.id,
          requestedByUserId: requester.userId,
          channel: 'WHATSAPP',
          status: MonthlyRoutineRequestStatus.SENT,
          targetPhone,
          message,
          providerMessageId: sendResult.messageId ?? null,
          providerConnectionKey: context.connectionKey,
          requestedAt: now,
          sentAt: now,
        },
        include: this.getManualRequestInclude(),
      });

      await competencyModel.update({
        where: { id: competency.id },
        data: {
          requestedAt: now,
          status:
            competency.status === MonthlyRoutineStatus.PENDING || competency.status === MonthlyRoutineStatus.OVERDUE
              ? MonthlyRoutineStatus.WAITING_CUSTOMER
              : competency.status,
        },
      });

      return {
        success: true,
        message: 'Solicitacao enviada e registrada com sucesso.',
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
          channel: 'WHATSAPP',
          status: MonthlyRoutineRequestStatus.FAILED,
          targetPhone,
          message,
          providerConnectionKey: context.connectionKey,
          errorMessage: error instanceof Error ? error.message : 'Falha ao enviar solicitacao manual.',
          requestedAt: now,
        },
      });

      if (error instanceof EvolutionOutboundError) {
        throw new BadRequestException(
          error.code === 'WHATSAPP_NUMBER_NOT_REGISTERED'
            ? 'O numero informado nao esta registrado no WhatsApp.'
            : 'A Evolution rejeitou o disparo manual desta solicitacao.',
        );
      }

      throw new BadRequestException('Nao foi possivel enviar a solicitacao manual. O erro foi registrado.');
    }
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
      throw new ForbiddenException('Sem permissao para acessar rotinas mensais.');
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
      throw new ForbiddenException('Sem permissao para gerenciar rotinas mensais.');
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
      throw new ForbiddenException('Empresa nao encontrada para configurar rotina mensal.');
    }

    return company;
  }

  private getCompetencyListInclude() {
    return {
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
        take: 5,
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

  private async ensureCompetenciesForScope(scope: { isGlobal: boolean; companyIds: string[] }, year: number, month: number) {
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

    let generated = 0;
    let updated = 0;

    for (const config of configs) {
      const lastDayOfMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
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
            status: dueDate < new Date() ? MonthlyRoutineStatus.OVERDUE : MonthlyRoutineStatus.PENDING,
          },
        });
        generated += 1;
        continue;
      }

      if (existing.dueDate?.getTime?.() !== dueDate.getTime()) {
        await competencyModel.update({
          where: { id: existing.id },
          data: { dueDate },
        });
        updated += 1;
      }
    }

    return { generated, updated };
  }

  private async markOverdueCompetencies(records: any[]) {
    const competencyModel = (this.prisma as any).monthlyRoutineCompetency;
    const now = new Date();
    const overdueIds = records
      .filter(
        (record) =>
          record.dueDate instanceof Date &&
          record.dueDate < now &&
          (record.status === 'PENDING' || record.status === 'WAITING_CUSTOMER'),
      )
      .map((record) => record.id);

    if (!overdueIds.length) return;

    await competencyModel.updateMany({
      where: {
        id: { in: overdueIds },
      },
      data: {
        status: MonthlyRoutineStatus.OVERDUE,
      },
    });
  }

  private toCompetencyItem(record: any): MonthlyRoutineCompetencyItem {
    const availableContacts = this.toContactOptions(record.company?.contactLinks ?? []);
    const manualRequests = Array.isArray(record.requests)
      ? record.requests.map((request: any) => this.toManualRequestItem(request))
      : [];
    const latestManualRequest = manualRequests[0] ?? null;

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
      requiredDocumentsCount: this.normalizeRequiredDocuments(record.config?.requiredDocuments).length,
      availableContacts,
      manualRequestsCount: manualRequests.length,
      lastManualRequestAt: latestManualRequest?.requestedAt ?? null,
      lastManualRequestStatus: latestManualRequest?.status ?? null,
      lastManualRequestContactName: latestManualRequest?.contactName ?? null,
      manualRequests,
    };
  }

  private toManualRequestItem(record: any) {
    return {
      id: record.id,
      contactId: record.contactId,
      contactName: record.contact?.name ?? 'Contato',
      requestedByUserName: record.requestedByUser?.name || record.requestedByUser?.email || 'Usuario',
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
  }) {
    const firstName = String(input.contactName || '').trim().split(/\s+/)[0] || 'Tudo bem';
    const competence = `${String(input.month).padStart(2, '0')}/${input.year}`;
    const checklist =
      input.requiredDocuments.length > 0
        ? ` Documentos esperados: ${input.requiredDocuments.join(', ')}.`
        : '';

    return `Ola, ${firstName}. Podemos gerar os arquivos da competencia ${competence} da empresa ${input.companyName} (${input.title})?${checklist} Se estiver tudo certo, por favor nos confirme por aqui.`;
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
