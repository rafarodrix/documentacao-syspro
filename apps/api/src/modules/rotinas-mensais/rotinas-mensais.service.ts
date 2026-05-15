import { ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import type {
  MonthlyRoutineCompanyItem,
  MonthlyRoutineCompanyConfigUpsertInput,
  MonthlyRoutineCompanyConfigView,
  MonthlyRoutineContactOption,
  MonthlyRoutineListQuery,
  MonthlyRoutineListResponse,
} from '@dosc-syspro/contracts/rotinas-mensais';
import { CompanyStatus } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class RotinasMensaisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async list(input: MonthlyRoutineListQuery, rawHeaders?: IncomingHttpHeaders): Promise<MonthlyRoutineListResponse> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const scope = await this.resolveRoutineViewScope(requester);
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

  private parsePage(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  }

  private parsePageSize(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.min(Math.floor(parsed), 100) : 20;
  }
}
