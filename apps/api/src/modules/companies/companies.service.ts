import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '@dosc-syspro/contracts';
import { CompanySegment, CompanyStatus, ConversationStatus, IntegrationConnectionStatus, RemoteHostStatus, Role, TaskStatus, TaskType } from '@prisma/client';
import { onlyDigits } from '@dosc-syspro/shared';
import type { IncomingHttpHeaders } from 'node:http';
import {
  type CompanyCockpitViewData,
  companyStatusUpdateSchema,
  type CompanyAdminView,
  type CompanyStatusUpdateInput,
  type CompanyListQuery,
  createCompanySchema,
  type CreateCompanyInput,
  type CreateCompanyOutput,
} from '@dosc-syspro/contracts/company';
import {
  appendEntityInactivationMetadata,
  parseContractBlockReason,
  parseEntityInactivationMetadata,
  removeEntityInactivationMetadata,
} from '@dosc-syspro/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { buildCompanySearchWhere } from '../shared/search/domain-search';
import { buildCompanySearchText } from '../shared/search/search-index';
import { ContactsService } from '../contacts/contacts.service';
const COMPANY_REGISTRY_PROVIDER = process.env.COMPANY_REGISTRY_PROVIDER?.toLowerCase() ?? 'brasilapi';
const COMPANY_REGISTRY_AUTH_URL = process.env.COMPANY_REGISTRY_AUTH_URL;
const COMPANY_REGISTRY_LOOKUP_URL =
  process.env.COMPANY_REGISTRY_LOOKUP_URL ?? 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}';
const COMPANY_REGISTRY_CLIENT_ID = process.env.COMPANY_REGISTRY_CLIENT_ID;
const COMPANY_REGISTRY_CLIENT_SECRET = process.env.COMPANY_REGISTRY_CLIENT_SECRET;
const COMPANY_REGISTRY_SCOPE = process.env.COMPANY_REGISTRY_SCOPE;
const COMPANY_REGISTRY_AUDIENCE = process.env.COMPANY_REGISTRY_AUDIENCE;
const COMPANY_REGISTRY_TIMEOUT_MS = Number(process.env.COMPANY_REGISTRY_TIMEOUT_MS ?? 12000);
const COMPANY_REGISTRY_USER_AGENT =
  process.env.COMPANY_REGISTRY_USER_AGENT?.trim() ||
  'TrilinkSoftware/1.0 (+https://ajuda.trilinksoftware.com.br)';
type NormalizedCompanyPartner = {
  name: string;
  qualification?: string;
  entryDate?: string;
};


function findEntityInactivationMarker(
  value: string | null | undefined,
  sourceId: string,
  targetType: 'company' | 'contract' | 'contact' | 'user',
) {
  const entries = String(value ?? '')
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const parsed = parseEntityInactivationMetadata(entry);
    if (parsed?.sourceId === sourceId && parsed.targetType === targetType) {
      return parsed;
    }
  }

  return null;
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function sumValues(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getTaskNextStepLabel(status: string) {
  switch (status) {
    case 'OVERDUE':
      return 'Cobrar cliente e destravar envio';
    case 'WAITING_CUSTOMER':
      return 'Aguardar documentos do cliente';
    case 'RECEIVED':
      return 'Conferir e encaminhar para contabilidade';
    case 'SENT_TO_ACCOUNTING':
      return 'Validar retorno da contabilidade';
    case 'PENDING':
      return 'Disparar solicitacao inicial';
    default:
      return null;
  }
}

function formatDateAttribute(value?: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatRequiredDateAttribute(value?: Date | string | null, fallback?: Date | string | null): string {
  return (
    formatDateAttribute(value) ??
    formatDateAttribute(fallback) ??
    new Date(0).toISOString()
  );
}

function buildCockpitHealthSummary(input: {
  hasContractBlock: boolean;
  responseOverdue: number;
  resolutionOverdue: number;
  responseDueSoon: number;
  resolutionDueSoon: number;
  monthlyOverdue: number;
  waitingCustomer: number;
  staleHostCount: number;
  inactiveIntegrationCount: number;
  deliveryFailureCount: number;
}) {
  const deductions = [
    input.hasContractBlock ? 35 : 0,
    Math.min(input.responseOverdue * 8, 24),
    Math.min(input.resolutionOverdue * 10, 30),
    Math.min((input.responseDueSoon + input.resolutionDueSoon) * 3, 12),
    Math.min(input.monthlyOverdue * 10, 20),
    Math.min(input.waitingCustomer * 3, 9),
    Math.min(input.staleHostCount * 6, 12),
    Math.min(input.inactiveIntegrationCount * 8, 16),
    Math.min(input.deliveryFailureCount * 4, 8),
  ];
  const score = clampNumber(100 - sumValues(deductions), 0, 100);

  if (score <= 49) {
    return {
      score,
      status: 'CRITICAL' as const,
      label: 'Critica',
      summary: 'A conta exige atuacao imediata em SLA, fiscal, infraestrutura ou bloqueio contratual.',
    };
  }

  if (score <= 79) {
    return {
      score,
      status: 'WATCH' as const,
      label: 'Atencao',
      summary: 'A conta esta operando com sinais de atrito e precisa de acompanhamento proximo.',
    };
  }

  return {
    score,
    status: 'HEALTHY' as const,
    label: 'Estavel',
    summary: 'A conta esta sob controle e sem gargalos operacionais relevantes no momento.',
  };
}

function legacyWhere<T extends object>(where: T) {
  return where as any;
}

function normalizeDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('/');
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

type RegistryPayload = Record<string, unknown>;

function asRecord(value: unknown): RegistryPayload {
  return value && typeof value === 'object' ? (value as RegistryPayload) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeRegistryPayload(payload: unknown, fallbackCnpj: string) {
  const payloadRecord = asRecord(payload);
  const addressSource = asRecord(
    payloadRecord.address ?? payloadRecord.endereco ?? payloadRecord.estabelecimento ?? payloadRecord,
  );
  const primaryActivitySource = payloadRecord.atividade_principal;
  const cnaeSource = Array.isArray(primaryActivitySource)
    ? asRecord(primaryActivitySource[0])
    : asRecord(payloadRecord.primaryCnae ?? payloadRecord.cnaePrincipal ?? primaryActivitySource ?? payloadRecord);
  const secondaryCnaesSource = asArray(
    payloadRecord.cnaesSecundarios ?? payloadRecord.cnaes_secundarios ?? payloadRecord.secondaryCnaes,
  );
  const partnersSource = asArray(payloadRecord.qsa ?? payloadRecord.partners ?? payloadRecord.socios);
  const normalizedSecondaryCnaes = secondaryCnaesSource
    .map((entry) => {
      const record = asRecord(entry);
      const code = firstString(record.code, record.codigo);
      const description = firstString(record.description, record.descricao);
      if (!code || !description) return null;
      return { code, description };
    })
    .filter((entry): entry is { code: string; description: string } => entry != null);
  const normalizedPartners = partnersSource
    .map<NormalizedCompanyPartner | null>((entry) => {
      const record = asRecord(entry);
      const name = firstString(record.name, record.nome_socio, record.nome, record.razao_social);
      if (!name) return null;

      return {
        name,
        qualification: firstString(
          record.qualification,
          record.qualificacao_socio,
          record.qualificacao,
        ),
        entryDate: normalizeDate(
          firstString(record.entryDate, record.data_entrada_sociedade, record.data_entrada),
        ),
      };
    })
    .filter((entry): entry is NormalizedCompanyPartner => entry != null);

  return {
    cnpj: onlyDigits(firstString(payloadRecord.cnpj, payloadRecord.documento, fallbackCnpj) ?? fallbackCnpj),
    legalName:
      firstString(
        payloadRecord.legalName,
        payloadRecord.razaoSocial,
        payloadRecord.razao_social,
        payloadRecord.nomeEmpresarial,
        payloadRecord.nome_empresarial,
        payloadRecord.name,
      ) ?? '',
    tradeName: firstString(
      payloadRecord.tradeName,
      payloadRecord.nomeFantasia,
      payloadRecord.nome_fantasia,
      payloadRecord.fantasia,
    ),
    status: firstString(payloadRecord.status, payloadRecord.situacaoCadastral, payloadRecord.situacao_cadastral),
    openingDate: normalizeDate(
      firstString(
        payloadRecord.openingDate,
        payloadRecord.dataAbertura,
        payloadRecord.data_abertura,
        payloadRecord.dataInicioAtividade,
        payloadRecord.data_inicio_atividade,
      ),
    ),
    primaryCnae: firstString(
      cnaeSource.code,
      cnaeSource.codigo,
      cnaeSource.id,
      cnaeSource.cod,
      payloadRecord.cnae,
      payloadRecord.cnaePrincipalCodigo,
      payloadRecord.cnae_principal_codigo,
      payloadRecord.cnae_fiscal,
    ),
    primaryCnaeDescription: firstString(
      cnaeSource.description,
      cnaeSource.descricao,
      cnaeSource.text,
      cnaeSource.nome,
      payloadRecord.cnaeDescricao,
      payloadRecord.cnae_descricao,
      payloadRecord.cnae_fiscal_descricao,
      payloadRecord.cnaePrincipalDescricao,
      payloadRecord.cnae_principal_descricao,
    ),
    legalNature: firstString(
      payloadRecord.legalNature,
      payloadRecord.naturezaJuridica,
      payloadRecord.natureza_juridica,
    ),
    size: firstString(payloadRecord.size, payloadRecord.porte, payloadRecord.descricao_porte),
    branchType: firstString(
      payloadRecord.branchType,
      payloadRecord.descricao_identificador_matriz_filial,
      payloadRecord.identificador_matriz_filial,
    ),
    taxRegistrationStatus: firstString(
      payloadRecord.taxRegistrationStatus,
      payloadRecord.descricao_situacao_cadastral,
      payloadRecord.situacaoCadastral,
      payloadRecord.situacao_cadastral,
      payloadRecord.status,
    ),
    secondaryCnaes: normalizedSecondaryCnaes,
    partners: normalizedPartners,
    email: firstString(payloadRecord.email, asRecord(payloadRecord.contato).email),
    phone: firstString(payloadRecord.phone, payloadRecord.telefone, asRecord(payloadRecord.contato).telefone),
    address: {
      cep: onlyDigits(firstString(addressSource.cep, payloadRecord.cep) ?? ''),
      street: firstString(addressSource.street, addressSource.logradouro, addressSource.tipo_logradouro),
      number: firstString(addressSource.number, addressSource.numero, payloadRecord.numero),
      complement: firstString(addressSource.complement, addressSource.complemento),
      district: firstString(addressSource.district, addressSource.bairro),
      city: firstString(addressSource.city, addressSource.cidade, addressSource.municipio),
      state: firstString(addressSource.state, addressSource.estado, addressSource.uf)?.toUpperCase(),
      country: firstString(addressSource.country, addressSource.pais) ?? 'BR',
    },
    raw: payloadRecord,
  };
}

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly contactsService: ContactsService,
  ) {}

  async searchCompanies(query: string | undefined, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const q = query?.trim() ?? '';
    if (!q) {
      return [];
    }

    const accessScope = await this.getCompanyViewScope(requester);
    if (!accessScope.isGlobal && accessScope.companyIds.length === 0) {
      return [];
    }

    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
        status: { not: CompanyStatus.INACTIVE },
        ...(!accessScope.isGlobal ? { id: { in: accessScope.companyIds } } : {}),
        ...buildCompanySearchWhere(q),
      },
      take: 10,
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true },
    });
  }

  async listCompanies(
    filters?: CompanyListQuery,
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getCompanyViewScope(requester);
    const wantsPagination = filters?.page !== undefined || filters?.pageSize !== undefined;
    const page = this.parsePage(filters?.page);
    const pageSize = this.parsePageSize(filters?.pageSize);

    const where: any = {
      AND: [
        {
          OR: [
            { deletedAt: null },
            { status: CompanyStatus.INACTIVE },
          ],
        },
      ],
    };

    if (filters?.search?.trim()) {
      where.AND.push(buildCompanySearchWhere(filters.search));
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status as CompanyStatus;
    }

    if (!accessScope.isGlobal) {
      where.id = { in: accessScope.companyIds.length ? accessScope.companyIds : ['__none__'] };
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        include: {
          _count: {
            select: {
              memberships: true,
              contactLinks: true,
              contracts: true,
              branches: true,
              accountingClients: true,
            },
          },
          addresses: {
            take: 1,
            orderBy: { id: 'asc' },
          },
          accountingFirm: { select: { id: true, nomeFantasia: true } },
        },
        orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
        ...(wantsPagination ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      }),
      wantsPagination ? this.prisma.company.count({ where }) : Promise.resolve(0),
    ]);

    const items = companies.map((company) => {
      const block = parseContractBlockReason(company.observacoes);
      return {
        ...company,
        usersCount: company._count?.memberships ?? 0,
        contactsCount: company._count?.contactLinks ?? 0,
        address: company.addresses?.[0] || null,
        isBlockedByContract: Boolean(block),
        contractBlockReasonLabel: block?.label ?? null,
      };
    });

    if (!wantsPagination) {
      return items;
    }

    return {
      items,
      pagination: buildPaginationMeta({ page, pageSize, total }),
    };
  }

  async getAdminView(rawHeaders?: IncomingHttpHeaders): Promise<CompanyAdminView> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getCompanyViewScope(requester);
    return {
      isGlobalView: accessScope.isGlobal,
    };
  }

  async getCompanyOptions(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const accessScope = await this.getCompanyViewScope(requester);

    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
        status: { not: CompanyStatus.INACTIVE },
        ...(!accessScope.isGlobal ? { id: { in: accessScope.companyIds.length ? accessScope.companyIds : ['__none__'] } } : {}),
      },
      orderBy: { razaoSocial: 'asc' },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
      },
    });
  }

  private parsePage(value?: string): number {
    const parsed = Number.parseInt(value || '1', 10);
    return Math.max(1, Number.isNaN(parsed) ? 1 : parsed);
  }

  private parsePageSize(value?: string): number {
    const parsed = Number.parseInt(value || '50', 10);
    return Math.min(100, Math.max(1, Number.isNaN(parsed) ? 50 : parsed));
  }

  async getCompanyEditView(companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const editScope = await this.getCompanyEditScope(requester);
    await this.assertCompanyAccess(companyId, editScope);

    const company = (await this.prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { deletedAt: null },
          { status: CompanyStatus.INACTIVE },
        ],
      },
      select: {
        id: true,
        cnpj: true,
        razaoSocial: true,
        nomeFantasia: true,
        segment: true,
        logoUrl: true,
        status: true,
        ...({
          serverType: true,
          serverPort: true,
          serverHost: true,
          serverProtocol: true,
          iisIsapiPath: true,
          installationDirectory: true,
          remoteConnections: true,
          remoteConnectionType: true,
          remoteConnectionDetails: true,
        } as any),
        parentCompanyId: true,
        accountingFirmId: true,
        regimeTributario: true,
        indicadorIE: true,
        inscricaoEstadual: true,
        inscricaoMunicipal: true,
        cnae: true,
        cnaeDescricao: true,
        cnaesSecundarios: true,
        codSuframa: true,
        dataFundacao: true,
        naturezaJuridica: true,
        porte: true,
        matrizFilial: true,
        situacaoCadastral: true,
        qsa: true,
        emailContato: true,
        emailFinanceiro: true,
        telefone: true,
        whatsapp: true,
        website: true,
        observacoes: true,
        addresses: {
          take: 1,
          orderBy: { id: 'asc' },
          select: {
            description: true,
            cep: true,
            logradouro: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            pais: true,
            codigoIbgeCidade: true,
            codigoIbgeEstado: true,
          },
        },
      } as any,
    } as any)) as any;

    if (!company) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    const companies = await this.getCompanyOptions(rawHeaders);

    const address = company.addresses[0];
    const remoteConnections = Array.isArray((company as any).remoteConnections)
      ? ((company as any).remoteConnections as Array<{ type?: string; details?: string }>)
          .filter((entry) => typeof entry?.type === 'string' && typeof entry?.details === 'string')
          .map((entry) => ({
            type: entry.type as 'DDNS_NOIP' | 'RADMIN_VPN',
            details: entry.details ?? '',
          }))
      : (company as any).remoteConnectionType
        ? [
            {
              type: (company as any).remoteConnectionType as 'DDNS_NOIP' | 'RADMIN_VPN',
              details: ((company as any).remoteConnectionDetails ?? '') as string,
            },
          ]
        : [];

    return {
      companyId: company.id,
      companies,
      canEditCnpj: editScope.isGlobal,
      initialData: {
        cnpj: company.cnpj,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia ?? '',
        segment: company.segment ?? undefined,
        logoUrl: company.logoUrl ?? '',
        status: company.status,
        serverType: ((company as any).serverType ?? 'SYSPRO_SERVER') as 'SYSPRO_SERVER' | 'IIS',
        serverPort: Number((company as any).serverPort ?? 1234),
        serverHost: ((company as any).serverHost ?? 'localhost') as string,
        serverProtocol: ((company as any).serverProtocol ?? 'HTTP') as 'HTTP' | 'HTTPS',
        iisIsapiPath: ((company as any).iisIsapiPath ?? 'SYSPROSERVERISAPI.DLL') as string,
        installationDirectory: ((company as any).installationDirectory ?? '') as string,
        remoteConnections,
        parentCompanyId: company.parentCompanyId ?? '',
        accountingFirmId: company.accountingFirmId ?? '',
        regimeTributario: company.regimeTributario ?? undefined,
        indicadorIE: company.indicadorIE,
        inscricaoEstadual: company.inscricaoEstadual ?? '',
        inscricaoMunicipal: company.inscricaoMunicipal ?? '',
        cnae: company.cnae ?? '',
        cnaeDescricao: company.cnaeDescricao ?? '',
        cnaesSecundarios: Array.isArray(company.cnaesSecundarios)
          ? (company.cnaesSecundarios as Array<{ code?: string; description?: string }>)
              .filter((entry) => typeof entry?.code === 'string' && typeof entry?.description === 'string')
              .map((entry) => ({ code: entry.code!, description: entry.description! }))
          : [],
        codSuframa: company.codSuframa ?? '',
        dataFundacao: company.dataFundacao ?? undefined,
        naturezaJuridica: company.naturezaJuridica ?? '',
        porte: company.porte ?? '',
        matrizFilial: company.matrizFilial ?? '',
        situacaoCadastral: company.situacaoCadastral ?? '',
        qsa: Array.isArray(company.qsa)
          ? (company.qsa as Array<{ name?: string; qualification?: string; entryDate?: string }>)
              .filter((entry) => typeof entry?.name === 'string')
              .map((entry) => ({
                name: entry.name!,
                qualification: typeof entry.qualification === 'string' ? entry.qualification : undefined,
                entryDate: typeof entry.entryDate === 'string' ? entry.entryDate : undefined,
              }))
          : [],
        emailContato: company.emailContato ?? '',
        emailFinanceiro: company.emailFinanceiro ?? '',
        telefone: company.telefone ?? '',
        whatsapp: company.whatsapp ?? '',
        website: company.website ?? '',
        observacoes: company.observacoes ?? '',
        address: address
          ? {
              description: address.description ?? 'Sede',
              cep: address.cep ?? '',
              logradouro: address.logradouro ?? '',
              numero: address.numero ?? '',
              complemento: address.complemento ?? '',
              bairro: address.bairro ?? '',
              cidade: address.cidade ?? '',
              estado: address.estado ?? '',
              pais: address.pais ?? 'BR',
              codigoIbgeCidade: address.codigoIbgeCidade ?? '',
              codigoIbgeEstado: address.codigoIbgeEstado ?? '',
            }
          : {
              description: 'Sede',
              cep: '',
              logradouro: '',
              numero: '',
              complemento: '',
              bairro: '',
              cidade: '',
              estado: '',
              pais: 'BR',
              codigoIbgeCidade: '',
              codigoIbgeEstado: '',
            },
      },
    };
  }

  async getCompanyCockpitView(companyId: string, rawHeaders?: IncomingHttpHeaders): Promise<CompanyCockpitViewData> {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const cockpitScope = await this.getCompanyCockpitScope(requester);
    await this.assertCompanyAccess(companyId, cockpitScope);

    try {
    const safeCockpitQuery = async <T>(label: string, factory: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await factory();
      } catch (error) {
        this.logger.error(
          `Falha ao carregar bloco ${label} do Empresa 360 para companyId=${companyId}.`,
          error instanceof Error ? error.stack : String(error),
        );
        return fallback;
      }
    };

    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        OR: [
          { deletedAt: null },
          { status: CompanyStatus.INACTIVE },
        ],
      },
      select: {
        id: true,
        cnpj: true,
        razaoSocial: true,
        nomeFantasia: true,
        status: true,
        segment: true,
        regimeTributario: true,
        observacoes: true,
        serverType: true,
        serverPort: true,
        serverHost: true,
        serverProtocol: true,
        installationDirectory: true,
        accountingFirm: {
          select: {
            razaoSocial: true,
            nomeFantasia: true,
          },
        },
        addresses: {
          take: 1,
          orderBy: { id: 'asc' },
          select: {
            cidade: true,
            estado: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            contactLinks: true,
            contracts: true,
            remoteHosts: true,
            integrationConnections: true,
            conversationLinks: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const staleConversationThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleHostThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const openTicketWhere = {
      companyId,
      status: {
        notIn: [ConversationStatus.RESOLVED, ConversationStatus.ARCHIVED],
      },
    };
    const openTaskWhere = {
      companyId,
      status: {
        notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELED],
      },
    };

    const [
      recentTickets,
      recentTasks,
      taskConfig,
      latestRoutineTasks,
      recentConversations,
      recentHosts,
      recentSessions,
      recentIntegrations,
      releaseTickets,
      openTicketsCount,
      openTasksCount,
      responseOverdueCount,
      resolutionOverdueCount,
      responseDueSoonCount,
      resolutionDueSoonCount,
      monthlyRoutinePendingCount,
      monthlyRoutineOverdueCount,
      monthlyRoutineWaitingCustomerCount,
      monthlyRoutineCompletedCount,
      staleHostCount,
      inactiveIntegrationCount,
      deliveryFailureCount,
    ] = await Promise.all([
      safeCockpitQuery('recentTickets', () => this.prisma.ticket.findMany({
        where: { companyId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          updatedAt: true,
          lastMessageAt: true,
          slaResponseDueAt: true,
          slaResponseHitAt: true,
          slaResolutionDueAt: true,
          slaResolutionHitAt: true,
          assignedUser: {
            select: {
              name: true,
            },
          },
        },
      }), []),
      safeCockpitQuery('recentTasks', () => this.prisma.task.findMany({
        where: { companyId },
        orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          dueDate: true,
          updatedAt: true,
          year: true,
          month: true,
          ticket: {
            select: {
              ticketNumber: true,
            },
          },
          assignedTo: {
            select: {
              name: true,
            },
          },
        },
      }), []),
      safeCockpitQuery('taskConfig', () => this.prisma.taskConfig.findUnique({
        where: { companyId },
        select: {
          isActive: true,
          title: true,
          dueDay: true,
          reminderDays: true,
        },
      }), null),
      safeCockpitQuery('latestRoutineTasks', () => this.prisma.task.findMany({
        where: {
          companyId,
          type: TaskType.ROTINA_MENSAL,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { updatedAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          year: true,
          month: true,
          status: true,
          dueDate: true,
          requestedAt: true,
          receivedAt: true,
          updatedAt: true,
          requests: {
            orderBy: [{ createdAt: 'desc' }],
            take: 1,
            select: {
              status: true,
            },
          },
        },
      }), []),
      safeCockpitQuery('recentConversations', () => this.prisma.conversationLink.findMany({
        where: { companyId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          chatwootConversationId: true,
          whatsappNumber: true,
          updatedAt: true,
          whatsappDeliveryStatus: true,
          lastDeliveryFailureAt: true,
          lastDeliveryFailureCode: true,
          connection: {
            select: {
              name: true,
              status: true,
              chatwootUrl: true,
              chatwootAccountId: true,
            },
          },
        },
      }), []),
      safeCockpitQuery('recentHosts', () => this.prisma.remoteHost.findMany({
        where: { companyId },
        orderBy: [{ lastHeartbeatSuccessAt: 'desc' }, { updatedAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          name: true,
          status: true,
          serviceStatus: true,
          lastHeartbeatSuccessAt: true,
          lastKnownRustDeskAlias: true,
          agentVersion: true,
        },
      }), []),
      safeCockpitQuery('recentSessions', () => this.prisma.remoteSession.findMany({
        where: { companyId },
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          status: true,
          createdAt: true,
          startedAt: true,
          endedAt: true,
          ticketNumber: true,
          host: {
            select: {
              name: true,
            },
          },
          requestedByUser: {
            select: {
              name: true,
            },
          },
        },
      }), []),
      safeCockpitQuery('recentIntegrations', () => this.prisma.integrationConnection.findMany({
        where: { companyId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 4,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          chatwootInboxId: true,
          chatwootInboxIdentifier: true,
          evolutionInstance: true,
        },
      }), []),
      safeCockpitQuery('releaseTickets', () => this.prisma.ticket.findMany({
        where: {
          companyId,
          publishToReleases: true,
        },
        orderBy: [{ closedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          resolutionSummary: true,
          releaseType: true,
          releaseModule: true,
          closedAt: true,
          resolutionVideoUrl: true,
        },
      }), []),
      safeCockpitQuery('openTicketsCount', () => this.prisma.ticket.count({ where: openTicketWhere }), 0),
      safeCockpitQuery('openTasksCount', () => this.prisma.task.count({ where: openTaskWhere }), 0),
      safeCockpitQuery('responseOverdueCount', () => this.prisma.ticket.count({
        where: {
          ...openTicketWhere,
          slaResponseHitAt: null,
          slaResponseDueAt: { lt: now },
        },
      }), 0),
      safeCockpitQuery('resolutionOverdueCount', () => this.prisma.ticket.count({
        where: {
          ...openTicketWhere,
          slaResolutionHitAt: null,
          slaResolutionDueAt: { lt: now },
        },
      }), 0),
      safeCockpitQuery('responseDueSoonCount', () => this.prisma.ticket.count({
        where: {
          ...openTicketWhere,
          slaResponseHitAt: null,
          slaResponseDueAt: {
            gte: now,
            lt: next24Hours,
          },
        },
      }), 0),
      safeCockpitQuery('resolutionDueSoonCount', () => this.prisma.ticket.count({
        where: {
          ...openTicketWhere,
          slaResolutionHitAt: null,
          slaResolutionDueAt: {
            gte: now,
            lt: next24Hours,
          },
        },
      }), 0),
      safeCockpitQuery('monthlyRoutinePendingCount', () => this.prisma.task.count({
        where: {
          companyId,
          type: TaskType.ROTINA_MENSAL,
          status: TaskStatus.PENDING,
        },
      }), 0),
      safeCockpitQuery('monthlyRoutineOverdueCount', () => this.prisma.task.count({
        where: {
          companyId,
          type: TaskType.ROTINA_MENSAL,
          OR: [
            { status: TaskStatus.OVERDUE },
            {
              status: {
                notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELED],
              },
              dueDate: { lt: now },
            },
          ],
        },
      }), 0),
      safeCockpitQuery('monthlyRoutineWaitingCustomerCount', () => this.prisma.task.count({
        where: {
          companyId,
          type: TaskType.ROTINA_MENSAL,
          status: TaskStatus.WAITING_CUSTOMER,
        },
      }), 0),
      safeCockpitQuery('monthlyRoutineCompletedCount', () => this.prisma.task.count({
        where: {
          companyId,
          type: TaskType.ROTINA_MENSAL,
          status: TaskStatus.COMPLETED,
        },
      }), 0),
      safeCockpitQuery('staleHostCount', () => this.prisma.remoteHost.count({
        where: {
          companyId,
          OR: [
            { status: { not: RemoteHostStatus.ACTIVE } },
            { lastHeartbeatSuccessAt: null },
            { lastHeartbeatSuccessAt: { lt: staleHostThreshold } },
          ],
        },
      }), 0),
      safeCockpitQuery('inactiveIntegrationCount', () => this.prisma.integrationConnection.count({
        where: {
          companyId,
          status: { not: IntegrationConnectionStatus.ACTIVE },
        },
      }), 0),
      safeCockpitQuery('deliveryFailureCount', () => this.prisma.conversationLink.count({
        where: {
          companyId,
          lastDeliveryFailureAt: { not: null },
        },
      }), 0),
    ]);

    const address = company.addresses[0];
    const block = parseContractBlockReason(company.observacoes);
    const accountingFirmName = company.accountingFirm?.nomeFantasia?.trim() || company.accountingFirm?.razaoSocial?.trim() || null;
    const companyTicketsHref = `/portal/tickets?companyId=${companyId}`;
    const companyNewTaskHref = `/portal/tarefas?companyId=${companyId}&newTask=true`;
    const companyMonthlyTasksHref = `/portal/tarefas?companyId=${companyId}&type=ROTINA_MENSAL`;
    const companyInfraHref = `/portal/infraestrutura?tab=hosts&companyId=${companyId}`;
    const companyIntegrationsHref = '/portal/configuracoes?tab=integrations';
    const companyEditHref = `/portal/cadastros/empresa/${companyId}/editar`;
    const health = buildCockpitHealthSummary({
      hasContractBlock: Boolean(block?.label),
      responseOverdue: responseOverdueCount,
      resolutionOverdue: resolutionOverdueCount,
      responseDueSoon: responseDueSoonCount,
      resolutionDueSoon: resolutionDueSoonCount,
      monthlyOverdue: monthlyRoutineOverdueCount,
      waitingCustomer: monthlyRoutineWaitingCustomerCount,
      staleHostCount,
      inactiveIntegrationCount,
      deliveryFailureCount,
    });

    const alerts: CompanyCockpitViewData['alerts'] = [];
    if (block?.label) {
      alerts.push({
        id: 'contract-block',
        severity: 'CRITICAL',
        title: 'Conta com bloqueio contratual',
        description: `A empresa esta marcada com bloqueio contratual: ${block.label}.`,
        href: companyEditHref,
        ctaLabel: 'Revisar cadastro',
      });
    }
    if (responseOverdueCount > 0 || resolutionOverdueCount > 0) {
      alerts.push({
        id: 'sla-overdue',
        severity: 'CRITICAL',
        title: 'SLA vencido em tickets ativos',
        description: `${responseOverdueCount} resposta(s) e ${resolutionOverdueCount} resolucao(oes) estao fora do SLA.`,
        href: companyTicketsHref,
        ctaLabel: 'Atuar nos tickets',
      });
    }
    if (monthlyRoutineOverdueCount > 0) {
      alerts.push({
        id: 'monthly-routine-overdue',
        severity: 'WARNING',
        title: 'Rotina fiscal atrasada',
        description: `${monthlyRoutineOverdueCount} rotina(s) mensal(is) estao atrasadas para esta conta.`,
        href: companyMonthlyTasksHref,
        ctaLabel: 'Abrir rotina fiscal',
      });
    }
    if (staleHostCount > 0) {
      alerts.push({
        id: 'stale-hosts',
        severity: 'WARNING',
        title: 'Hosts sem heartbeat recente',
        description: `${staleHostCount} host(s) estao sem heartbeat valido ou com status degradado.`,
        href: companyInfraHref,
        ctaLabel: 'Ver infraestrutura',
      });
    }
    if (inactiveIntegrationCount > 0) {
      alerts.push({
        id: 'integration-degraded',
        severity: 'WARNING',
        title: 'Integracoes degradadas',
        description: `${inactiveIntegrationCount} integracao(oes) nao estao ativas para esta empresa.`,
        href: companyIntegrationsHref,
        ctaLabel: 'Abrir integracoes',
      });
    }
    if (deliveryFailureCount > 0) {
      alerts.push({
        id: 'delivery-failure',
        severity: 'INFO',
        title: 'Falhas recentes de entrega em conversas',
        description: `${deliveryFailureCount} conversa(s) possuem registro de falha de entrega.`,
        href: companyIntegrationsHref,
        ctaLabel: 'Ver integracoes',
      });
    }

    const prioritizedTicket = recentTickets.find((ticket) => {
      const responseOverdue = Boolean(ticket.slaResponseDueAt && !ticket.slaResponseHitAt && ticket.slaResponseDueAt < now);
      const resolutionOverdue = Boolean(ticket.slaResolutionDueAt && !ticket.slaResolutionHitAt && ticket.slaResolutionDueAt < now);
      return responseOverdue || resolutionOverdue;
    }) ?? recentTickets[0] ?? null;

    const prioritizedRoutine = latestRoutineTasks.find((task) =>
      task.status === TaskStatus.OVERDUE || task.status === TaskStatus.WAITING_CUSTOMER || task.status === TaskStatus.PENDING,
    ) ?? latestRoutineTasks[0] ?? null;

    const prioritizedConversation = recentConversations.find((conversation) => Boolean(conversation.lastDeliveryFailureAt))
      ?? recentConversations[0]
      ?? null;

    const recommendedActions: CompanyCockpitViewData['recommendedActions'] = [];
    if (prioritizedTicket && (responseOverdueCount > 0 || resolutionOverdueCount > 0)) {
      recommendedActions.push({
        id: 'act-on-ticket',
        tone: 'danger',
        title: prioritizedTicket.ticketNumber ? `Responder ticket #${prioritizedTicket.ticketNumber}` : 'Atuar no ticket mais critico',
        description: 'Existe risco real de SLA nesta conta e esse deve ser o primeiro movimento operacional.',
        href: `/portal/tickets/${prioritizedTicket.id}`,
        ctaLabel: 'Abrir ticket',
      });
    }
    if (prioritizedRoutine && monthlyRoutineOverdueCount > 0) {
      recommendedActions.push({
        id: 'recover-routine',
        tone: 'warning',
        title: `Recuperar competencia ${String(prioritizedRoutine.month ?? 0).padStart(2, '0')}/${prioritizedRoutine.year ?? now.getFullYear()}`,
        description: 'A rotina fiscal precisa ser retomada para reduzir atraso operacional e dependencia do cliente.',
        href: companyMonthlyTasksHref,
        ctaLabel: 'Abrir rotina',
      });
    }
    if (staleHostCount > 0) {
      recommendedActions.push({
        id: 'check-hosts',
        tone: 'warning',
        title: 'Verificar host sem heartbeat recente',
        description: 'A operacao remota pode ficar cega se o agente ou o host permanecerem degradados.',
        href: companyInfraHref,
        ctaLabel: 'Abrir hosts',
      });
    }
    if (prioritizedConversation) {
      const chatwootBaseUrl = prioritizedConversation.connection?.chatwootUrl?.trim().replace(/\/+$/, '') || null;
      const chatwootAccountId = prioritizedConversation.connection?.chatwootAccountId?.trim() || null;
      if (chatwootBaseUrl && chatwootAccountId) {
        recommendedActions.push({
          id: 'follow-conversation',
          tone: prioritizedConversation.lastDeliveryFailureAt ? 'warning' : 'neutral',
          title: 'Retomar ultima conversa vinculada',
          description: prioritizedConversation.lastDeliveryFailureAt
            ? 'Ha sinal de falha na entrega e vale validar a conversa diretamente no Chatwoot.'
            : 'Use a ultima conversa vinculada como contexto rapido de atendimento.',
          href: `${chatwootBaseUrl}/app/accounts/${chatwootAccountId}/conversations/${prioritizedConversation.chatwootConversationId}`,
          ctaLabel: 'Abrir conversa',
        });
      }
    }
    if (!recommendedActions.length) {
      recommendedActions.push({
        id: 'create-task',
        tone: 'neutral',
        title: 'Criar proxima acao da conta',
        description: 'A conta esta estavel. Registre a proxima tarefa ou chamado para manter a operacao organizada.',
        href: companyNewTaskHref,
        ctaLabel: 'Nova tarefa',
      });
    }

    return {
      profile: {
        companyId: company.id,
        displayName: company.nomeFantasia?.trim() || company.razaoSocial,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia ?? null,
        cnpj: company.cnpj,
        status: company.status,
        segment: company.segment ?? null,
        regimeTributario: company.regimeTributario ?? null,
        city: address?.cidade ?? null,
        state: address?.estado ?? null,
        accountingFirmName,
        blockedReasonLabel: block?.label ?? null,
        installationDirectory: company.installationDirectory ?? null,
        serverHost: company.serverHost ?? null,
        serverType: company.serverType ?? null,
        serverProtocol: company.serverProtocol ?? null,
        serverPort: company.serverPort ?? null,
        counts: {
          users: company._count.memberships,
          contacts: company._count.contactLinks,
          contracts: company._count.contracts,
          remoteHosts: company._count.remoteHosts,
          integrationConnections: company._count.integrationConnections,
          conversationLinks: company._count.conversationLinks,
          openTickets: openTicketsCount,
          openTasks: openTasksCount,
        },
      },
      sla: {
        openTickets: openTicketsCount,
        responseOverdue: responseOverdueCount,
        resolutionOverdue: resolutionOverdueCount,
        responseDueSoon: responseDueSoonCount,
        resolutionDueSoon: resolutionDueSoonCount,
      },
      health,
      alerts,
      recommendedActions,
      tickets: recentTickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber ?? null,
        subject: ticket.subject ?? null,
        status: String(ticket.status ?? 'UNKNOWN'),
        priority: String(ticket.priority ?? 'UNKNOWN'),
        assignedToName: ticket.assignedUser?.name?.trim() || null,
        updatedAt: formatRequiredDateAttribute(ticket.updatedAt),
        lastMessageAt: formatDateAttribute(ticket.lastMessageAt),
        slaResponseDueAt: formatDateAttribute(ticket.slaResponseDueAt),
        slaResolutionDueAt: formatDateAttribute(ticket.slaResolutionDueAt),
        isResponseOverdue: Boolean(ticket.slaResponseDueAt && !ticket.slaResponseHitAt && ticket.slaResponseDueAt < now),
        isResolutionOverdue: Boolean(ticket.slaResolutionDueAt && !ticket.slaResolutionHitAt && ticket.slaResolutionDueAt < now),
      })),
      tasks: recentTasks.map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type === TaskType.TAREFA ? 'TAREFA' : 'ROTINA_MENSAL',
        status: String(task.status ?? 'UNKNOWN'),
        dueDate: formatRequiredDateAttribute(task.dueDate, task.updatedAt),
        updatedAt: formatRequiredDateAttribute(task.updatedAt, task.dueDate),
        assignedToName: task.assignedTo?.name?.trim() || null,
        ticketNumber: task.ticket?.ticketNumber ?? null,
        competenceLabel:
          typeof task.year === 'number' && typeof task.month === 'number'
            ? `${String(task.month).padStart(2, '0')}/${task.year}`
            : null,
        nextStepLabel: getTaskNextStepLabel(task.status),
      })),
      monthlyRoutine: {
        isConfigured: Boolean(taskConfig),
        isActive: Boolean(taskConfig?.isActive),
        title: taskConfig?.title ?? null,
        dueDay: taskConfig?.dueDay ?? null,
        reminderDays: taskConfig?.reminderDays ?? null,
        pendingCount: monthlyRoutinePendingCount,
        overdueCount: monthlyRoutineOverdueCount,
        waitingCustomerCount: monthlyRoutineWaitingCustomerCount,
        completedCount: monthlyRoutineCompletedCount,
        latestItems: latestRoutineTasks.map((task) => ({
          id: task.id,
          competenceLabel:
            typeof task.year === 'number' && typeof task.month === 'number'
              ? `${String(task.month).padStart(2, '0')}/${task.year}`
              : 'Sem competencia',
          status: String(task.status ?? 'UNKNOWN'),
          dueDate: formatRequiredDateAttribute(task.dueDate, task.updatedAt),
          requestedAt: formatDateAttribute(task.requestedAt),
          receivedAt: formatDateAttribute(task.receivedAt),
          updatedAt: formatRequiredDateAttribute(task.updatedAt, task.dueDate),
          lastRequestStatus: task.requests[0]?.status ? String(task.requests[0].status) : null,
          nextStepLabel:
            task.status === TaskStatus.OVERDUE
              ? 'Cobrar cliente e reenviar solicitacao'
              : task.status === TaskStatus.WAITING_CUSTOMER
                ? 'Acompanhar resposta do cliente'
                : task.status === TaskStatus.RECEIVED
                  ? 'Conferir documentos recebidos'
                  : getTaskNextStepLabel(task.status),
        })),
      },
      conversations: recentConversations.map((conversation) => {
        const chatwootBaseUrl = conversation.connection?.chatwootUrl?.trim().replace(/\/+$/, '') || null;
        const accountId = conversation.connection?.chatwootAccountId?.trim() || null;
        return {
          id: conversation.id,
          chatwootConversationId: conversation.chatwootConversationId,
          whatsappNumber: conversation.whatsappNumber,
          connectionName: conversation.connection?.name ?? null,
          connectionStatus: conversation.connection?.status ?? null,
          chatwootUrl:
            chatwootBaseUrl && accountId
              ? `${chatwootBaseUrl}/app/accounts/${accountId}/conversations/${conversation.chatwootConversationId}`
              : null,
          updatedAt: formatRequiredDateAttribute(conversation.updatedAt),
          lastDeliveryStatus: String(conversation.whatsappDeliveryStatus ?? 'UNKNOWN'),
          lastFailureAt: formatDateAttribute(conversation.lastDeliveryFailureAt),
          lastFailureCode: conversation.lastDeliveryFailureCode ?? null,
          isStale: conversation.updatedAt < staleConversationThreshold,
        };
      }),
      hosts: recentHosts.map((host) => ({
        id: host.id,
        name: host.name,
        status: String(host.status ?? 'UNKNOWN'),
        serviceStatus: host.serviceStatus ?? null,
        lastHeartbeatSuccessAt: formatDateAttribute(host.lastHeartbeatSuccessAt),
        lastKnownRustDeskAlias: host.lastKnownRustDeskAlias ?? null,
        agentVersion: host.agentVersion ?? null,
      })),
      sessions: recentSessions.map((session) => ({
        id: session.id,
        status: String(session.status ?? 'UNKNOWN'),
        createdAt: formatRequiredDateAttribute(session.createdAt),
        startedAt: formatDateAttribute(session.startedAt),
        endedAt: formatDateAttribute(session.endedAt),
        hostName: session.host?.name?.trim() || 'Host remoto',
        requestedByName: session.requestedByUser?.name?.trim() || null,
        ticketNumber: session.ticketNumber ?? null,
      })),
      integrations: recentIntegrations.map((connection) => ({
        id: connection.id,
        name: connection.name?.trim() || 'Conexao sem nome',
        status: String(connection.status ?? 'UNKNOWN'),
        updatedAt: formatRequiredDateAttribute(connection.updatedAt),
        chatwootInboxLabel: connection.chatwootInboxIdentifier || connection.chatwootInboxId || null,
        evolutionInstance: connection.evolutionInstance || null,
      })),
      releases: releaseTickets.map((ticket) => ({
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber ?? null,
        type: ticket.releaseType ?? null,
        module: ticket.releaseModule ?? null,
        title: ticket.subject?.trim() || `Release ${ticket.ticketNumber ?? ticket.id}`,
        summary: ticket.resolutionSummary ?? null,
        publishedAt: formatDateAttribute(ticket.closedAt),
        resolutionVideoUrl: ticket.resolutionVideoUrl ?? null,
      })),
    };
    } catch (error) {
      this.logger.error(
        `Falha ao montar Empresa 360 para companyId=${companyId} e userId=${requester.userId}.`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async canAccessByCompanySegment(requiredSegments: CompanySegment[], rawHeaders?: IncomingHttpHeaders) {
    if (!requiredSegments.length) return true;

    const requester = await this.authorizationService.getRequester(rawHeaders);
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId: requester.userId,
        company: {
          deletedAt: null,
          status: CompanyStatus.ACTIVE,
        },
      },
      select: {
        company: {
          select: { segment: true },
        },
      },
    });

    const membershipSegments = memberships.map((membership) => membership.company.segment);
    if (!membershipSegments.length || membershipSegments.some((segment) => segment == null)) {
      return true;
    }

    const definedSegments = membershipSegments.filter(
      (segment): segment is CompanySegment => segment != null,
    );

    return definedSegments.some((segment) => requiredSegments.includes(segment));
  }

  async lookupCompanyProfileByCnpj(cnpj: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    const [canCreateCompanies, canEditCompanies] = await Promise.all([
      this.authorizationService.userHasPermission(requester, 'companies:create'),
      this.authorizationService.userHasPermission(requester, 'companies:edit', { acceptCompanyScope: true }),
    ]);

    if (!canCreateCompanies && !canEditCompanies) {
      return { success: false, message: 'Permissao negada.' };
    }

    const normalizedCnpj = onlyDigits(String(cnpj ?? ''));
    if (normalizedCnpj.length !== 14) {
      return { success: false, message: 'Informe um CNPJ completo para consulta.' };
    }

    if (!this.isCompanyRegistryConfigured()) {
      return {
        success: false,
        message: 'Integracao oficial de CNPJ nao configurada.',
        data: {
          configured: false,
          provider: this.getCompanyRegistryProviderLabel(),
        },
      };
    }

    try {
      const profile = await this.fetchCompanyProfileByCnpj(normalizedCnpj);
      return {
        success: true,
        data: {
          configured: true,
          provider: this.getCompanyRegistryProviderLabel(),
          profile,
        },
      };
    } catch (error) {
      this.logger.error(
        `Falha ao consultar CNPJ ${normalizedCnpj} via ${this.getCompanyRegistryProviderLabel()}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return { success: false, message: 'Ocorreu um erro interno. Tente novamente.' };
    }
  }

  async createCompany(
    payload: {
      data: CreateCompanyInput | CreateCompanyOutput;
    },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!(await this.authorizationService.userHasPermission(requester, 'companies:create'))) {
      return { success: false, message: 'Permissao negada.' };
    }

    const validation = createCompanySchema.safeParse(payload.data);
    if (!validation.success) {
      return {
        success: false,
        errors: validation.error.flatten().fieldErrors,
        message: 'Verifique os campos destacados.',
      };
    }

    const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

    try {
      const result = await this.prisma.company.create({
        data: {
          ...validData,
          cnpj: validData.cnpj,
          searchText: buildCompanySearchText(validData),
          addresses:
            address && typeof address === 'object' && address.cep
              ? {
                  create: {
                    ...address,
                    description: address.description || 'Sede',
                  },
                }
              : undefined,
          accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : undefined,
          parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : undefined,
        } as any,
      });
      return { success: true, message: 'Empresa criada com sucesso!' };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  async updateCompany(
    companyId: string,
    payload: {
      data: CreateCompanyInput | CreateCompanyOutput;
    } | null | undefined,
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!(await this.authorizationService.userHasPermission(requester, 'companies:edit', { acceptCompanyScope: true }))) {
      return { success: false, message: 'Permissao negada.' };
    }

    const editScope = await this.getCompanyEditScope(requester);
    await this.assertCompanyAccess(companyId, editScope);

    const payloadData = payload?.data;
    if (!payloadData || typeof payloadData !== 'object') {
      this.logger.warn({
        event: 'company.update.invalid_payload',
        companyId,
        requesterId: requester.userId,
        hasPayload: Boolean(payload),
        payloadType: typeof payloadData,
      });
      return {
        success: false,
        message: 'Payload invalido. Envie os dados da empresa no campo data.',
      };
    }

    const validation = createCompanySchema.safeParse(payloadData);
    if (!validation.success) {
      this.logger.warn({
        event: 'company.update.validation_failed',
        companyId,
        requesterId: requester.userId,
        errorFields: Object.keys(validation.error.flatten().fieldErrors),
      });
      return {
        success: false,
        errors: validation.error.flatten().fieldErrors,
        message: 'Verifique os campos destacados.',
      };
    }

    try {
      this.logger.log({
        event: 'company.update.received',
        companyId,
        requesterId: requester.userId,
        isGlobalEditor: editScope.isGlobal,
        payloadSnapshot: {
          cnpj: (payloadData as any).cnpj ?? null,
          razaoSocial: (payloadData as any).razaoSocial ?? null,
          nomeFantasia: (payloadData as any).nomeFantasia ?? null,
          status: (payloadData as any).status ?? null,
          parentCompanyId: (payloadData as any).parentCompanyId ?? null,
          accountingFirmId: (payloadData as any).accountingFirmId ?? null,
          hasAddress: Boolean((payloadData as any).address),
          remoteConnectionsCount: Array.isArray((payloadData as any).remoteConnections)
            ? (payloadData as any).remoteConnections.length
            : 0,
        },
      });

      const existing = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          cnpj: true,
          status: true,
          addresses: {
            select: { id: true },
            take: 1,
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!existing) {
        return { success: false, message: 'Empresa nao encontrada.' };
      }

      if (validation.data.status !== existing.status) {
        return {
          success: false,
          message: 'Use a acao de ativar/inativar empresa para alterar o status operacional.',
        };
      }

      const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;
      const nextCnpj = editScope.isGlobal ? validData.cnpj : existing.cnpj;
      const nextParentCompanyId = parentCompanyId || null;
      const nextAccountingFirmId = accountingFirmId || null;

      this.logger.log({
        event: 'company.update.validated',
        companyId,
        requesterId: requester.userId,
        currentSnapshot: {
          cnpj: existing.cnpj,
          status: existing.status,
          hasAddress: Boolean(existing.addresses[0]),
        },
        nextSnapshot: {
          cnpj: nextCnpj,
          status: validation.data.status,
          parentCompanyId: nextParentCompanyId,
          accountingFirmId: nextAccountingFirmId,
          hasAddress: Boolean(address && typeof address === 'object' && address.cep),
        },
      });

      if (nextParentCompanyId && nextParentCompanyId === companyId) {
        return { success: false, message: 'A empresa nao pode ser vinculada como propria matriz.' };
      }

      if (nextAccountingFirmId && nextAccountingFirmId === companyId) {
        return { success: false, message: 'A empresa nao pode ser vinculada como proprio escritorio contabil.' };
      }

      const referencedIds = [nextParentCompanyId, nextAccountingFirmId].filter(
        (value): value is string => Boolean(value),
      );
      if (referencedIds.length > 0) {
        const referencedCompanies = await this.prisma.company.findMany({
          where: {
            id: { in: referencedIds },
            deletedAt: null,
          },
          select: { id: true },
        });
        const existingReferencedIds = new Set(referencedCompanies.map((company) => company.id));

        if (nextParentCompanyId && !existingReferencedIds.has(nextParentCompanyId)) {
          return { success: false, message: 'A empresa matriz selecionada nao foi encontrada.' };
        }

        if (nextAccountingFirmId && !existingReferencedIds.has(nextAccountingFirmId)) {
          return { success: false, message: 'O escritorio contabil selecionado nao foi encontrado.' };
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.company.update({
          where: { id: companyId },
          data: {
            ...validData,
            cnpj: nextCnpj,
            searchText: buildCompanySearchText({ ...validData, cnpj: nextCnpj }),
            parentCompanyId: nextParentCompanyId,
            accountingFirmId: nextAccountingFirmId,
          } as any,
        });

        if (address && typeof address === 'object' && address.cep) {
          if (existing.addresses[0]) {
            await tx.address.update({
              where: { id: existing.addresses[0].id },
              data: {
                ...address,
                description: address.description || 'Sede',
              },
            });
          } else {
            await tx.address.create({
              data: {
                ...address,
                description: address.description || 'Sede',
                companyId,
              },
            });
          }
        } else if (existing.addresses[0]) {
          await tx.address.delete({
            where: { id: existing.addresses[0].id },
          });
        }
      });

      const persisted = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          status: true,
          parentCompanyId: true,
          accountingFirmId: true,
          addresses: {
            take: 1,
            orderBy: { id: 'asc' },
            select: {
              cep: true,
              logradouro: true,
              numero: true,
              cidade: true,
              estado: true,
            },
          },
        },
      });

      this.logger.log({
        event: 'company.update.persisted',
        companyId,
        requesterId: requester.userId,
        persisted,
      });

      void this.contactsService.syncChatwootContactsForCompany(companyId).catch((error: any) => {
        this.logger.error(
          `Falha ao sincronizar contatos da empresa ${companyId} com Chatwoot: ${error?.message ?? 'unknown_error'}`,
        );
      });

      return { success: true, message: 'Empresa atualizada com sucesso!' };
    } catch (error: any) {
      this.logger.error(
        `Falha ao atualizar empresa ${companyId}: ${error?.message ?? 'unknown_error'}`,
        error?.stack,
      );
      return this.toMutationError(error);
    }
  }

  async updateCompanyStatus(companyId: string, input: CompanyStatusUpdateInput, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!(await this.authorizationService.userHasPermission(requester, 'companies:status'))) {
      return { success: false, message: 'Sem permissao.' };
    }

    try {
      const parsed = companyStatusUpdateSchema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
          message: 'Verifique o motivo da alteracao de status.',
        };
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          status: true,
          observacoes: true,
        },
      });
      if (!company) {
        return { success: false, message: 'Empresa nao encontrada.' };
      }

      if (company.status === parsed.data.status) {
        return {
          success: true,
          message: parsed.data.status === CompanyStatus.INACTIVE
            ? 'Empresa ja esta inativa.'
            : 'Empresa ja esta ativa.',
        };
      }

      const summary = await this.prisma.$transaction(async (tx) => {
        if (parsed.data.status === CompanyStatus.INACTIVE) {
          return this.deactivateCompanyCascade(tx, company, parsed.data);
        }

        return this.reactivateCompanyCascade(tx, company);
      });

      void this.contactsService.syncChatwootContactsForCompany(companyId).catch((error: any) => {
        this.logger.error(
          `Falha ao sincronizar contatos da empresa ${companyId} apos alteracao de status: ${error?.message ?? 'unknown_error'}`,
        );
      });

      return {
        success: true,
        message: summary.message,
        data: summary,
      };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  private async deactivateCompanyCascade(
    tx: any,
    company: { id: string; razaoSocial: string; nomeFantasia: string | null; observacoes: string | null },
    input: CompanyStatusUpdateInput,
  ) {
    const companyLabel = company.nomeFantasia?.trim() || company.razaoSocial;
    const metadata = {
      reason: input.reason!,
      details: input.details ?? null,
      sourceType: 'company' as const,
      sourceId: company.id,
      sourceLabel: companyLabel,
    };

    await tx.company.update({
      where: { id: company.id },
      data: {
        status: CompanyStatus.INACTIVE,
        deletedAt: null,
        observacoes: appendEntityInactivationMetadata(company.observacoes, {
          ...metadata,
          targetType: 'company',
        }),
      },
    });

    const contractsToSuspend = await tx.contract.findMany({
      where: {
        companyId: company.id,
        status: { not: 'CANCELLED' },
      },
      select: { id: true, notes: true, status: true },
    });

    let suspendedContracts = 0;
    for (const contract of contractsToSuspend) {
      if (contract.status === 'SUSPENDED') {
        continue;
      }

      suspendedContracts += 1;
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: 'SUSPENDED',
          notes: appendEntityInactivationMetadata(contract.notes, {
            ...metadata,
            targetType: 'contract',
          }),
        },
      });
    }

    const contacts = await tx.companyContact.findMany({
      where: {
        companyLinks: { some: { companyId: company.id } },
      },
      select: {
        id: true,
        status: true,
        notes: true,
        companyLinks: {
          select: { companyId: true },
        },
      },
    });

    let archivedContacts = 0;
    for (const contact of contacts) {
      if (contact.companyLinks.length !== 1 || contact.status === 'ARCHIVED') {
        continue;
      }

      archivedContacts += 1;
      await tx.companyContact.update({
        where: { id: contact.id },
        data: {
          status: 'ARCHIVED',
          notes: appendEntityInactivationMetadata(contact.notes, {
            ...metadata,
            targetType: 'contact',
          }),
        },
      });
    }

    const clientUsers = await tx.user.findMany({
      where: {
        deletedAt: null,
        role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
        memberships: { some: { companyId: company.id } },
      },
      select: {
        id: true,
        isActive: true,
        banReason: true,
        memberships: {
          select: { companyId: true },
        },
      },
    });

    let inactivatedUsers = 0;
    for (const user of clientUsers) {
      if (user.memberships.length !== 1 || !user.isActive) {
        continue;
      }

      inactivatedUsers += 1;
      await tx.user.update({
        where: { id: user.id },
        data: {
          isActive: false,
          banReason: appendEntityInactivationMetadata(user.banReason, {
            ...metadata,
            targetType: 'user',
          }),
        },
      });
    }

    return {
      companyId: company.id,
      status: CompanyStatus.INACTIVE,
      suspendedContracts,
      archivedContacts,
      inactivatedUsers,
      message: 'Empresa inativada com cascata aplicada em contratos, contatos e usuarios elegiveis.',
    };
  }

  private async reactivateCompanyCascade(
    tx: any,
    company: { id: string; observacoes: string | null },
  ) {
    await tx.company.update({
      where: { id: company.id },
      data: {
        status: CompanyStatus.ACTIVE,
        deletedAt: null,
        observacoes: removeEntityInactivationMetadata(company.observacoes, {
          sourceType: 'company',
          sourceId: company.id,
          targetType: 'company',
        }),
      },
    });

    const contractsToReactivate = await tx.contract.findMany({
      where: {
        companyId: company.id,
        status: 'SUSPENDED',
      },
      select: { id: true, notes: true },
    });

    let reactivatedContracts = 0;
    for (const contract of contractsToReactivate) {
      const marker = findEntityInactivationMarker(contract.notes, company.id, 'contract');
      if (!marker || marker.sourceId !== company.id || marker.targetType !== 'contract') {
        continue;
      }

      reactivatedContracts += 1;
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: 'ACTIVE',
          notes: removeEntityInactivationMetadata(contract.notes, {
            sourceType: 'company',
            sourceId: company.id,
            targetType: 'contract',
          }),
        },
      });
    }

    const contactsToReactivate = await tx.companyContact.findMany({
      where: {
        status: 'ARCHIVED',
        companyLinks: { some: { companyId: company.id } },
      },
      select: {
        id: true,
        notes: true,
        companyLinks: {
          select: { companyId: true },
        },
      },
    });

    let reactivatedContacts = 0;
    for (const contact of contactsToReactivate) {
      const marker = findEntityInactivationMarker(contact.notes, company.id, 'contact');
      if (!marker || marker.sourceId !== company.id || marker.targetType !== 'contact') {
        continue;
      }

      reactivatedContacts += 1;
      await tx.companyContact.update({
        where: { id: contact.id },
        data: {
          status: contact.companyLinks.length ? 'LINKED' : 'PENDING_LINK',
          notes: removeEntityInactivationMetadata(contact.notes, {
            sourceType: 'company',
            sourceId: company.id,
            targetType: 'contact',
          }),
        },
      });
    }

    const usersToReactivate = await tx.user.findMany({
      where: {
        deletedAt: null,
        isActive: false,
        role: { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] },
        memberships: { some: { companyId: company.id } },
      },
      select: {
        id: true,
        banReason: true,
        memberships: { select: { companyId: true } },
      },
    });

    let reactivatedUsers = 0;
    for (const user of usersToReactivate) {
      if (user.memberships.length !== 1) {
        continue;
      }

      const marker = findEntityInactivationMarker(user.banReason, company.id, 'user');
      if (!marker || marker.sourceId !== company.id || marker.targetType !== 'user') {
        continue;
      }

      reactivatedUsers += 1;
      await tx.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          banReason: removeEntityInactivationMetadata(user.banReason, {
            sourceType: 'company',
            sourceId: company.id,
            targetType: 'user',
          }),
        },
      });
    }

    return {
      companyId: company.id,
      status: CompanyStatus.ACTIVE,
      reactivatedContracts,
      reactivatedContacts,
      reactivatedUsers,
      message: 'Empresa reativada com recuperacao da cadeia vinculada por inativacao desta empresa.',
    };
  }

  async deleteCompany(companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders);
    if (!(await this.authorizationService.userHasPermission(requester, 'companies:delete'))) {
      return { success: false, message: 'Sem permissao.' };
    }

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
          _count: {
            select: {
              memberships: true,
              contactLinks: true,
              addresses: true,
              userContactLinks: true,
              contracts: true,
              remoteHosts: true,
              branches: true,
              accountingClients: true,
            },
          },
        },
      });

      if (!company) {
        return { success: false, message: 'Empresa nao encontrada.' };
      }

      const [
        userAccessProfilesCount,
        remoteSessionsCount,
        conversationsCount,
        conversationLinksCount,
        messageLinksCount,
        integrationConnectionsCount,
        agentDevicesCount,
        remoteAddressBookCredentialsCount,
        remoteHostSysproUpdatesCount,
      ] = await Promise.all([
        this.prisma.userAccessProfile.count({ where: { companyId } }),
        this.prisma.remoteSession.count({ where: { companyId } }),
        this.prisma.ticket.count({ where: { companyId } }),
        this.prisma.conversationLink.count({ where: { companyId } }),
        this.prisma.messageLink.count({ where: { companyId } }),
        this.prisma.integrationConnection.count({ where: { companyId } }),
        this.prisma.agentDevice.count({ where: legacyWhere({ companyId }) }),
        this.prisma.remoteAddressBookCredential.count({ where: { companyId } }),
        this.prisma.remoteHostSysproUpdate.count({ where: { companyId } }),
      ]);

      const operationalLinks =
        company._count.memberships +
        company._count.contactLinks +
        company._count.userContactLinks +
        company._count.contracts +
        company._count.remoteHosts +
        company._count.branches +
        company._count.accountingClients +
        userAccessProfilesCount;

      const historicalLinks = sumValues([
        remoteSessionsCount,
        conversationsCount,
        conversationLinksCount,
        messageLinksCount,
        integrationConnectionsCount,
        agentDevicesCount,
        remoteAddressBookCredentialsCount,
        remoteHostSysproUpdatesCount,
      ]);

      if (operationalLinks > 0 || historicalLinks > 0) {
        const companyLabel = company.nomeFantasia?.trim() || company.razaoSocial;
        return {
          success: false,
          message: `A empresa ${companyLabel} possui historico ou registros vinculados. Use a inativacao em vez da exclusao.`,
        };
      }

      await this.prisma.company.delete({ where: { id: companyId } });
      return { success: true, message: 'Empresa excluida com sucesso.' };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  private async assertCompanyAccess(companyId: string, accessScope: { isGlobal: boolean; companyIds: string[] }) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, deletedAt: true, status: true },
    });

    if (!company || (company.deletedAt && company.status !== CompanyStatus.INACTIVE)) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    if (accessScope.isGlobal) {
      return;
    }

    if (!accessScope.companyIds.includes(companyId)) {
      throw new ForbiddenException('Sem permissao para acessar esta empresa.');
    }
  }

  private toMutationError(error: any) {
    if (error instanceof BadRequestException) {
      return { success: false, message: error.message };
    }

    const code = error?.code;
    if (code === 'P2002') {
      return { success: false, message: 'Este CNPJ ja esta cadastrado no sistema.' };
    }

    return { success: false, message: 'Ocorreu um erro interno. Tente novamente.' };
  }

  private isCompanyRegistryConfigured() {
    if (COMPANY_REGISTRY_PROVIDER === 'brasilapi') {
      return true;
    }

    return Boolean(
      COMPANY_REGISTRY_PROVIDER === 'custom_oauth2' &&
        COMPANY_REGISTRY_AUTH_URL &&
        COMPANY_REGISTRY_LOOKUP_URL &&
        COMPANY_REGISTRY_CLIENT_ID &&
        COMPANY_REGISTRY_CLIENT_SECRET,
    );
  }

  private getCompanyRegistryProviderLabel() {
    if (!this.isCompanyRegistryConfigured()) {
      return 'Nao configurado';
    }

    if (COMPANY_REGISTRY_PROVIDER === 'brasilapi') {
      return 'BrasilAPI';
    }

    return 'Integracao oficial de CNPJ';
  }

  private async fetchCompanyProfileByCnpj(cnpj: string) {
    if (!this.isCompanyRegistryConfigured() || !COMPANY_REGISTRY_LOOKUP_URL) {
      throw new Error('Integracao oficial de CNPJ nao configurada.');
    }

    const resolvedUrl = COMPANY_REGISTRY_LOOKUP_URL.includes('{cnpj}')
      ? COMPANY_REGISTRY_LOOKUP_URL.replace('{cnpj}', cnpj)
      : `${COMPANY_REGISTRY_LOOKUP_URL}${COMPANY_REGISTRY_LOOKUP_URL.includes('?') ? '&' : '?'}cnpj=${cnpj}`;

    this.logger.log(`Consultando CNPJ ${cnpj} via ${this.getCompanyRegistryProviderLabel()} em ${resolvedUrl}`);

    const response =
        COMPANY_REGISTRY_PROVIDER === 'brasilapi'
          ? await this.fetchBrasilApiCompanyProfile(cnpj)
          : await this.fetchCustomOauthCompanyProfile(cnpj);

    if (!response.ok) {
      const bodyText = await response.text();
      this.logger.warn(
        `Consulta CNPJ ${cnpj} retornou HTTP ${response.status} ${response.statusText}. Body: ${bodyText.slice(0, 600)}`,
      );
      throw new Error(`Falha ao consultar CNPJ no provedor oficial [${response.status}].`);
    }

    const payload = await response.json();
    const normalized = normalizeRegistryPayload(payload, cnpj);
    if (!normalized.legalName) {
      this.logger.warn(`Consulta CNPJ ${cnpj} retornou payload sem razao social utilizavel.`);
      throw new Error('O provedor retornou dados sem razao social normalizavel.');
    }

    return normalized;
  }

  private async fetchBrasilApiCompanyProfile(cnpj: string) {
    const resolvedUrl = COMPANY_REGISTRY_LOOKUP_URL.includes('{cnpj}')
      ? COMPANY_REGISTRY_LOOKUP_URL.replace('{cnpj}', cnpj)
      : `${COMPANY_REGISTRY_LOOKUP_URL}${COMPANY_REGISTRY_LOOKUP_URL.includes('?') ? '&' : '?'}cnpj=${cnpj}`;

      return this.fetchWithTimeout(resolvedUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': COMPANY_REGISTRY_USER_AGENT,
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        },
      });
    }

  private async fetchCustomOauthCompanyProfile(cnpj: string) {
    const token = await this.getCompanyRegistryAccessToken();
    const resolvedUrl = COMPANY_REGISTRY_LOOKUP_URL.includes('{cnpj}')
      ? COMPANY_REGISTRY_LOOKUP_URL.replace('{cnpj}', cnpj)
      : `${COMPANY_REGISTRY_LOOKUP_URL}${COMPANY_REGISTRY_LOOKUP_URL.includes('?') ? '&' : '?'}cnpj=${cnpj}`;

    return this.fetchWithTimeout(resolvedUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  }

  private async getCompanyRegistryAccessToken() {
    if (!COMPANY_REGISTRY_AUTH_URL || !COMPANY_REGISTRY_CLIENT_ID || !COMPANY_REGISTRY_CLIENT_SECRET) {
      throw new Error('Credenciais da integracao de CNPJ nao configuradas.');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: COMPANY_REGISTRY_CLIENT_ID,
      client_secret: COMPANY_REGISTRY_CLIENT_SECRET,
    });

    if (COMPANY_REGISTRY_SCOPE) body.set('scope', COMPANY_REGISTRY_SCOPE);
    if (COMPANY_REGISTRY_AUDIENCE) body.set('audience', COMPANY_REGISTRY_AUDIENCE);

    const response = await this.fetchWithTimeout(COMPANY_REGISTRY_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Falha ao autenticar no provedor CNPJ [${response.status}].`);
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error('Token de acesso nao retornado pela integracao de CNPJ.');
    }

    return data.access_token;
  }

  private async fetchWithTimeout(url: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMPANY_REGISTRY_TIMEOUT_MS);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getCompanyViewScope(requester: { userId: string; role: Role; email?: string }) {
    const primaryScope = await this.authorizationService.resolveCompanyAccessScope(
      requester as { userId: string; role: Role; email: string },
      'companies:view_own',
      'companies:view_all',
    );

    if (primaryScope.isGlobal || primaryScope.companyIds.length > 0) {
      return primaryScope;
    }

    return this.authorizationService.resolveCompanyAccessScope(
      requester as { userId: string; role: Role; email: string },
      'companies:view',
      'companies:view_all',
    );
  }

  private async getCompanyEditScope(requester: { userId: string; role: Role; email?: string }) {
    return this.authorizationService.resolveCompanyAccessScope(
      requester as { userId: string; role: Role; email: string },
      'companies:edit',
      'companies:view_all',
    );
  }

  private async getCompanyCockpitScope(requester: { userId: string; role: Role; email?: string }) {
    return this.authorizationService.resolveCompanyAccessScope(
      requester as { userId: string; role: Role; email: string },
      'companies:view_cockpit',
      'companies:view_all',
    );
  }
}
