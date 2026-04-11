import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CompanyContactSource, CompanyContactStatus, CompanySegment, CompanyStatus, Role } from '@prisma/client';
import type { IncomingHttpHeaders } from 'node:http';
import {
  createCompanySchema,
  type CreateCompanyInput,
  type CreateCompanyOutput,
} from '@dosc-syspro/contracts/company';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

type CompanyTicketEmailInput = {
  email: string;
  label?: string;
  isActive?: boolean;
};

type CompanyContactInput = {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  isPrimary?: boolean;
  source?: CompanyContactSource;
  status?: CompanyContactStatus;
};

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CREATE_ROLES: Role[] = SYSTEM_ROLES;
const UPDATE_ROLES: Role[] = [...SYSTEM_ROLES, Role.CLIENTE_ADMIN];
const DELETE_ROLES: Role[] = [Role.ADMIN];
const COMPANY_REGISTRY_PROVIDER = process.env.COMPANY_REGISTRY_PROVIDER?.toLowerCase() ?? 'brasilapi';
const COMPANY_REGISTRY_AUTH_URL = process.env.COMPANY_REGISTRY_AUTH_URL;
const COMPANY_REGISTRY_LOOKUP_URL =
  process.env.COMPANY_REGISTRY_LOOKUP_URL ?? 'https://brasilapi.com.br/api/cnpj/v1/{cnpj}';
const COMPANY_REGISTRY_CLIENT_ID = process.env.COMPANY_REGISTRY_CLIENT_ID;
const COMPANY_REGISTRY_CLIENT_SECRET = process.env.COMPANY_REGISTRY_CLIENT_SECRET;
const COMPANY_REGISTRY_SCOPE = process.env.COMPANY_REGISTRY_SCOPE;
const COMPANY_REGISTRY_AUDIENCE = process.env.COMPANY_REGISTRY_AUDIENCE;
const COMPANY_REGISTRY_TIMEOUT_MS = Number(process.env.COMPANY_REGISTRY_TIMEOUT_MS ?? 12000);
const CONTRACT_BLOCK_MARKER = '[CONTRACT_BLOCK]';
const CONTRACT_BLOCK_REASON_LABEL = {
  EMPRESA_FECHOU: 'Empresa fechou',
  TROCOU_SISTEMA: 'Trocou de sistema',
  INADIMPLENCIA: 'Inadimplencia',
  OUTROS: 'Outros',
} as const;

type ContractBlockReason = keyof typeof CONTRACT_BLOCK_REASON_LABEL;
type NormalizedCompanyPartner = {
  name: string;
  qualification?: string;
  entryDate?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
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
  const cnaeSource = asRecord(
    payloadRecord.primaryCnae ?? payloadRecord.cnaePrincipal ?? payloadRecord.atividade_principal ?? payloadRecord,
  );
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
      firstString(payloadRecord.openingDate, payloadRecord.dataAbertura, payloadRecord.data_abertura),
    ),
    primaryCnae: firstString(
      cnaeSource.code,
      cnaeSource.codigo,
      payloadRecord.cnae,
      payloadRecord.cnaePrincipalCodigo,
      payloadRecord.cnae_principal_codigo,
    ),
    primaryCnaeDescription: firstString(
      cnaeSource.description,
      cnaeSource.descricao,
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
      street: firstString(addressSource.street, addressSource.logradouro),
      number: firstString(addressSource.number, addressSource.numero),
      complement: firstString(addressSource.complement, addressSource.complemento),
      district: firstString(addressSource.district, addressSource.bairro),
      city: firstString(addressSource.city, addressSource.cidade, addressSource.municipio),
      state: firstString(addressSource.state, addressSource.estado, addressSource.uf)?.toUpperCase(),
      country: firstString(addressSource.country, addressSource.pais) ?? 'BR',
    },
    raw: payloadRecord,
  };
}

function parseContractBlockReason(notes: string | null | undefined) {
  if (!notes || !notes.startsWith(CONTRACT_BLOCK_MARKER)) return null;

  const payload = notes.slice(CONTRACT_BLOCK_MARKER.length);
  const [rawReason, rawDetails = ''] = payload.split('|');
  if (!(rawReason in CONTRACT_BLOCK_REASON_LABEL)) return null;

  const reason = rawReason as ContractBlockReason;
  const details = rawDetails.trim() || null;
  const label = details ? `${CONTRACT_BLOCK_REASON_LABEL[reason]}: ${details}` : CONTRACT_BLOCK_REASON_LABEL[reason];

  return { reason, details, label };
}

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async searchCompanies(query: string | undefined, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const q = query?.trim() ?? '';
    if (!q) {
      return [];
    }

    const companyIds = await this.getScopedCompanyIds(requester.userId, requester.role);

    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(companyIds ? { id: { in: companyIds.length ? companyIds : ['__none__'] } } : {}),
        OR: [
          { razaoSocial: { contains: q, mode: 'insensitive' } },
          { nomeFantasia: { contains: q, mode: 'insensitive' } },
          { cnpj: { contains: q.replace(/\D/g, '') } },
        ],
      },
      take: 10,
      orderBy: [{ nomeFantasia: 'asc' }, { razaoSocial: 'asc' }],
      select: { id: true, razaoSocial: true, nomeFantasia: true, cnpj: true },
    });
  }

  async listCompanies(
    filters?: { search?: string; status?: string },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.getRequester(rawHeaders);
    const companyIds = await this.getScopedCompanyIds(requester.userId, requester.role);

    const where: any = { deletedAt: null };

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search.replace(/\D/g, '') } },
      ];
    }

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status as CompanyStatus;
    }

    if (companyIds) {
      where.id = { in: companyIds.length ? companyIds : ['__none__'] };
    }

    const companies = await this.prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            memberships: true,
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
    });

    return companies.map((company) => {
      const block = parseContractBlockReason(company.observacoes);
      return {
        ...company,
        usersCount: company._count?.memberships ?? 0,
        address: company.addresses?.[0] || null,
        isBlockedByContract: Boolean(block),
        contractBlockReasonLabel: block?.label ?? null,
      };
    });
  }

  async getAdminView(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const companies = await this.listCompanies(undefined, rawHeaders);

    return {
      companies,
      isGlobalView: requester.role !== Role.CLIENTE_ADMIN,
    };
  }

  async getCompanyOptions(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    const companyIds = await this.getScopedCompanyIds(requester.userId, requester.role);

    return this.prisma.company.findMany({
      where: {
        deletedAt: null,
        ...(companyIds ? { id: { in: companyIds.length ? companyIds : ['__none__'] } } : {}),
      },
      orderBy: { razaoSocial: 'asc' },
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
      },
    });
  }

  async getCompanyTicketEmails(companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    await this.assertCompanyAccess(companyId, requester.userId, requester.role);

    const rows = await this.prisma.companyTicketEmail.findMany({
      where: { companyId },
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
      select: { email: true, label: true, isActive: true },
    });

    return rows.map((item) => ({
      email: item.email,
      label: item.label ?? undefined,
      isActive: item.isActive,
    }));
  }

  async getCompanyEditView(companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    await this.assertCompanyAccess(companyId, requester.userId, requester.role);

    const company = (await this.prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
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
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          select: {
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            notes: true,
            isPrimary: true,
            source: true,
            status: true,
          },
        },
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

    const [companies, ticketEmailsResult] = await Promise.all([
      this.getCompanyOptions(rawHeaders),
      this.getCompanyTicketEmails(company.id, rawHeaders),
    ]);

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

    const initialContacts = company.contacts.map((contact: any) => ({
      name: contact.name,
      email: contact.email ?? undefined,
      phone: contact.phone ?? undefined,
      whatsapp: contact.whatsapp ?? undefined,
      notes: contact.notes ?? undefined,
      isPrimary: contact.isPrimary,
      source: contact.source,
      status: contact.status,
    }));

    return {
      companyId: company.id,
      companies,
      canEditCnpj: requester.role !== Role.CLIENTE_ADMIN,
      initialTicketEmails: ticketEmailsResult,
      initialContacts,
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

  async canAccessByCompanySegment(requiredSegments: CompanySegment[], rawHeaders?: IncomingHttpHeaders) {
    if (!requiredSegments.length) return true;

    const requester = await this.getRequester(rawHeaders);
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
    const requester = await this.getRequester(rawHeaders);
    if (!UPDATE_ROLES.includes(requester.role)) {
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
      ticketEmails?: CompanyTicketEmailInput[];
      contacts?: CompanyContactInput[];
    },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.getRequester(rawHeaders);
    if (!CREATE_ROLES.includes(requester.role)) {
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

    const { address, parentCompanyId, accountingFirmId, contacts: validatedContacts, ...validData } =
      validation.data;

    try {
      const result = await this.prisma.company.create({
        data: {
          ...validData,
          cnpj: validData.cnpj,
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

      await this.replaceCompanyTicketEmails(result.id, payload.ticketEmails);
      await this.replaceCompanyContacts(result.id, payload.contacts ?? validatedContacts);

      return { success: true, message: 'Empresa criada com sucesso!' };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  async updateCompany(
    companyId: string,
    payload: {
      data: CreateCompanyInput | CreateCompanyOutput;
      ticketEmails?: CompanyTicketEmailInput[];
      contacts?: CompanyContactInput[];
    },
    rawHeaders?: IncomingHttpHeaders,
  ) {
    const requester = await this.getRequester(rawHeaders);
    if (!UPDATE_ROLES.includes(requester.role)) {
      return { success: false, message: 'Permissao negada.' };
    }

    await this.assertCompanyAccess(companyId, requester.userId, requester.role);

    const validation = createCompanySchema.safeParse(payload.data);
    if (!validation.success) {
      return {
        success: false,
        errors: validation.error.flatten().fieldErrors,
        message: 'Verifique os campos destacados.',
      };
    }

    try {
      const existing = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          cnpj: true,
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

      const { address, parentCompanyId, accountingFirmId, contacts: validatedContacts, ...validData } =
        validation.data;
      const nextCnpj = requester.role === Role.CLIENTE_ADMIN ? existing.cnpj : validData.cnpj;

      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          ...validData,
          cnpj: nextCnpj,
          accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : { disconnect: true },
          parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : { disconnect: true },
          addresses:
            address && typeof address === 'object' && address.cep
              ? existing.addresses[0]
                ? {
                    update: {
                      where: { id: existing.addresses[0].id },
                      data: {
                        ...address,
                        description: address.description || 'Sede',
                      },
                    },
                  }
                : {
                    create: {
                      ...address,
                      description: address.description || 'Sede',
                    },
                  }
              : existing.addresses[0]
                ? {
                    delete: {
                      id: existing.addresses[0].id,
                    },
                  }
                : undefined,
        } as any,
      });

      await this.replaceCompanyTicketEmails(companyId, payload.ticketEmails);
      await this.replaceCompanyContacts(companyId, payload.contacts ?? validatedContacts);

      return { success: true, message: 'Empresa atualizada com sucesso!' };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  async updateCompanyStatus(companyId: string, status: CompanyStatus, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    if (!SYSTEM_ROLES.includes(requester.role)) {
      return { success: false, message: 'Sem permissao.' };
    }

    try {
      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          status,
          deletedAt: status === CompanyStatus.INACTIVE ? new Date() : null,
        },
      });

      return {
        success: true,
        message:
          status === CompanyStatus.INACTIVE
            ? 'Empresa inativada com sucesso.'
            : 'Empresa reativada com sucesso.',
      };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  async deleteCompany(companyId: string, rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.getRequester(rawHeaders);
    if (!DELETE_ROLES.includes(requester.role)) {
      return { success: false, message: 'Sem permissao.' };
    }

    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          _count: {
            select: {
              memberships: true,
              contracts: true,
              branches: true,
              accountingClients: true,
            },
          },
        },
      });

      if (!company) {
        return { success: false, message: 'Empresa nao encontrada.' };
      }

      const linkedRecords =
        company._count.memberships +
        company._count.contracts +
        company._count.branches +
        company._count.accountingClients;

      if (linkedRecords > 0) {
        return {
          success: false,
          message: 'Empresa possui registros vinculados. Inative em vez de excluir.',
        };
      }

      await this.prisma.company.delete({ where: { id: companyId } });
      return { success: true, message: 'Empresa excluida com sucesso.' };
    } catch (error: any) {
      return this.toMutationError(error);
    }
  }

  private async getRequester(rawHeaders?: IncomingHttpHeaders) {
    const session = await this.authService.auth.api.getSession({
      headers: this.toHeaders(rawHeaders),
    });

    const email = session?.user?.email;
    if (!email) throw new UnauthorizedException('Nao autenticado.');

    const requester = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true, deletedAt: true },
    });

    if (!requester || requester.deletedAt || !requester.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return { userId: requester.id, role: requester.role };
  }

  private async getScopedCompanyIds(userId: string, role: Role) {
    if (role !== Role.CLIENTE_ADMIN) {
      return null;
    }

    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { companyId: true },
    });

    return memberships.map((item) => item.companyId);
  }

  private async assertCompanyAccess(companyId: string, userId: string, role: Role) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, deletedAt: true },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    if (role !== Role.CLIENTE_ADMIN) {
      return;
    }

    const companyIds = await this.getScopedCompanyIds(userId, role);
    if (!companyIds?.includes(companyId)) {
      throw new ForbiddenException('Sem permissao para acessar esta empresa.');
    }
  }

  private toHeaders(rawHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!rawHeaders) return headers;

    for (const [key, value] of Object.entries(rawHeaders)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value);
      }
    }

    return headers;
  }

  private normalizeTicketEmails(items: CompanyTicketEmailInput[] | undefined): CompanyTicketEmailInput[] {
    if (!Array.isArray(items)) return [];

    const map = new Map<string, CompanyTicketEmailInput>();
    for (const item of items) {
      const rawEmail = typeof item?.email === 'string' ? item.email.trim().toLowerCase() : '';
      if (!rawEmail) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) continue;

      map.set(rawEmail, {
        email: rawEmail,
        label: typeof item?.label === 'string' ? item.label.trim() || undefined : undefined,
        isActive: item?.isActive ?? true,
      });
    }

    return Array.from(map.values());
  }

  private normalizeCompanyContacts(items: CompanyContactInput[] | undefined): CompanyContactInput[] {
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => ({
        name: typeof item?.name === 'string' ? item.name.trim() : '',
        email: typeof item?.email === 'string' ? item.email.trim().toLowerCase() || undefined : undefined,
        phone: typeof item?.phone === 'string' ? item.phone.trim() || undefined : undefined,
        whatsapp: typeof item?.whatsapp === 'string' ? item.whatsapp.trim() || undefined : undefined,
        notes: typeof item?.notes === 'string' ? item.notes.trim() || undefined : undefined,
        isPrimary: item?.isPrimary ?? false,
        source: item?.source,
        status: item?.status,
      }))
      .filter((item) => item.name.length > 0);
  }

  private async replaceCompanyTicketEmails(companyId: string, items: CompanyTicketEmailInput[] | undefined) {
    if (items === undefined) return;

    const normalized = this.normalizeTicketEmails(items);

    await this.prisma.companyTicketEmail.deleteMany({
      where: { companyId },
    });

    if (normalized.length === 0) return;

    await this.prisma.companyTicketEmail.createMany({
      data: normalized.map((item) => ({
        companyId,
        email: item.email,
        label: item.label,
        isActive: item.isActive ?? true,
      })),
      skipDuplicates: true,
    });
  }

  private async replaceCompanyContacts(companyId: string, items: CompanyContactInput[] | undefined) {
    if (items === undefined) return;

    const normalized = this.normalizeCompanyContacts(items).map((item, index) => ({
      ...item,
      isPrimary: index === 0 ? true : Boolean(item.isPrimary),
    }));

    await this.prisma.companyContact.deleteMany({
      where: { companyId },
    });

    if (normalized.length === 0) return;

    await this.prisma.companyContact.createMany({
      data: normalized.map((item) => ({
        companyId,
        name: item.name,
        email: item.email,
        phone: item.phone,
        whatsapp: item.whatsapp,
        notes: item.notes,
        isPrimary: item.isPrimary ?? false,
        source: item.source,
        status: item.status,
      })),
    });
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
}
