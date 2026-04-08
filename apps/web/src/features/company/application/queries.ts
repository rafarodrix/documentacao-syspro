import { notFound } from "next/navigation";
import { Prisma, Role, CompanyStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { parseContractBlockReason } from "@dosc-syspro/core";
import type {
  CompanyAdminListViewData,
  CompanyContactInput,
  CompanyListItem,
  CompanyEditViewData,
  CompanyOption,
  CompanyTicketEmailInput,
} from "@/features/company/domain/model";

async function getSessionCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

export async function getCompaniesQuery(filters?: {
  search?: string;
  status?: string;
}): Promise<CompanyListItem[]> {
  const session = await getProtectedSession();
  if (!session) return [];

  const whereClause: Prisma.CompanyWhereInput = { deletedAt: null };

  if (filters?.search) {
    const search = filters.search.trim();
    whereClause.OR = [
      { razaoSocial: { contains: search, mode: "insensitive" } },
      { nomeFantasia: { contains: search, mode: "insensitive" } },
      { cnpj: { contains: search.replace(/\D/g, "") } },
    ];
  }

  if (filters?.status && filters.status !== "ALL") {
    whereClause.status = filters.status as CompanyStatus;
  }

  const companyIds = session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : [];
  if (session.role === Role.CLIENTE_ADMIN) {
    whereClause.id = { in: companyIds.length ? companyIds : ["__none__"] };
  }

  const companies = await prisma.company.findMany({
    where: whereClause,
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
        orderBy: { id: "asc" },
      },
      accountingFirm: { select: { id: true, nomeFantasia: true } },
    },
    orderBy: [{ nomeFantasia: "asc" }, { razaoSocial: "asc" }],
  });

  return companies.map((company) => {
    const block = parseContractBlockReason(company.observacoes);
    return {
      ...company,
      usersCount: company._count?.memberships ?? 0,
      address: company.addresses?.[0] || null,
      isBlockedByContract: Boolean(block),
      contractBlockReasonLabel: block?.label ?? null,
    } satisfies CompanyListItem;
  });
}

export async function getCompanyTicketEmailsQuery(companyId: string): Promise<CompanyTicketEmailInput[]> {
  const session = await getProtectedSession();
  if (!session) return [];

  const companyScopeIds =
    session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;
  if (session.role === Role.CLIENTE_ADMIN && (!companyScopeIds?.length || !companyScopeIds.includes(companyId))) {
    return [];
  }

  const rows = await prisma.companyTicketEmail.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    select: { email: true, label: true, isActive: true },
  });

  return rows.map((item) => ({
    email: item.email,
    label: item.label ?? undefined,
    isActive: item.isActive,
  }));
}

export async function getCompanyOptionsAction(): Promise<CompanyOption[]> {
  const session = await getProtectedSession();
  if (!session) return [];

  const companyScopeIds =
    session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      ...(session.role === Role.CLIENTE_ADMIN
        ? { id: { in: companyScopeIds?.length ? companyScopeIds : ["__none__"] } }
        : {}),
    },
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
    },
  });

  return companies;
}

export async function getCadastrosCompaniesAdminViewData(): Promise<CompanyAdminListViewData | { error: string }> {
  const session = await getProtectedSession();
  if (!session) return { error: "Nao autorizado" };

  const companies = await getCompaniesQuery();

  return {
    companies,
    isGlobalView: session.role !== Role.CLIENTE_ADMIN,
  };
}

export async function getCompanyEditViewData(companyId: string): Promise<CompanyEditViewData> {
  const session = await getProtectedSession();
  if (!session) notFound();

  const companyScopeIds =
    session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;

  const company = (await prisma.company.findFirst({
    where: {
      id: companyId,
      deletedAt: null,
      ...(session.role === Role.CLIENTE_ADMIN
        ? { id: { in: companyScopeIds?.length ? companyScopeIds : ["__none__"] } }
        : {}),
    },
    select: {
      id: true,
      cnpj: true,
      razaoSocial: true,
      nomeFantasia: true,
      segment: true,
      logoUrl: true,
      status: true,
      ...( {
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
      codSuframa: true,
      dataFundacao: true,
      emailContato: true,
      emailFinanceiro: true,
      telefone: true,
      whatsapp: true,
      website: true,
      observacoes: true,
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
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
        orderBy: { id: "asc" },
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

  if (!company) notFound();

  const [companies, ticketEmailsResult] = await Promise.all([
    getCompanyOptionsAction(),
    getCompanyTicketEmailsQuery(company.id),
  ]);

  const address = company.addresses[0];
  const remoteConnections = Array.isArray((company as any).remoteConnections)
    ? ((company as any).remoteConnections as Array<{ type?: string; details?: string }>)
        .filter((entry) => typeof entry?.type === "string" && typeof entry?.details === "string")
        .map((entry) => ({
          type: entry.type as "DDNS_NOIP" | "RADMIN_VPN",
          details: entry.details ?? "",
        }))
    : (company as any).remoteConnectionType
      ? [
          {
            type: (company as any).remoteConnectionType as "DDNS_NOIP" | "RADMIN_VPN",
            details: ((company as any).remoteConnectionDetails ?? "") as string,
          },
        ]
      : [];
  const initialTicketEmails: CompanyTicketEmailInput[] = ticketEmailsResult;
  const initialContacts: CompanyContactInput[] = company.contacts.map((contact: any) => ({
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
    canEditCnpj: session.role !== Role.CLIENTE_ADMIN,
    initialTicketEmails,
    initialContacts,
    initialData: {
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia ?? "",
      segment: company.segment ?? undefined,
      logoUrl: company.logoUrl ?? "",
      status: company.status,
      serverType: ((company as any).serverType ?? "SYSPRO_SERVER") as "SYSPRO_SERVER" | "IIS",
      serverPort: Number((company as any).serverPort ?? 1234),
      serverHost: ((company as any).serverHost ?? "localhost") as string,
      serverProtocol: ((company as any).serverProtocol ?? "HTTP") as "HTTP" | "HTTPS",
      iisIsapiPath: ((company as any).iisIsapiPath ?? "SYSPROSERVERISAPI.DLL") as string,
      installationDirectory: ((company as any).installationDirectory ?? "") as string,
      remoteConnections,
      parentCompanyId: company.parentCompanyId ?? "",
      accountingFirmId: company.accountingFirmId ?? "",
      regimeTributario: company.regimeTributario ?? undefined,
      indicadorIE: company.indicadorIE,
      inscricaoEstadual: company.inscricaoEstadual ?? "",
      inscricaoMunicipal: company.inscricaoMunicipal ?? "",
      cnae: company.cnae ?? "",
      codSuframa: company.codSuframa ?? "",
      dataFundacao: company.dataFundacao ?? undefined,
      emailContato: company.emailContato ?? "",
      emailFinanceiro: company.emailFinanceiro ?? "",
      telefone: company.telefone ?? "",
      whatsapp: company.whatsapp ?? "",
      website: company.website ?? "",
      observacoes: company.observacoes ?? "",
      address: address
        ? {
            description: address.description ?? "Sede",
            cep: address.cep ?? "",
            logradouro: address.logradouro ?? "",
            numero: address.numero ?? "",
            complemento: address.complemento ?? "",
            bairro: address.bairro ?? "",
            cidade: address.cidade ?? "",
            estado: address.estado ?? "",
            pais: address.pais ?? "BR",
            codigoIbgeCidade: address.codigoIbgeCidade ?? "",
            codigoIbgeEstado: address.codigoIbgeEstado ?? "",
          }
        : {
            description: "Sede",
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "",
            bairro: "",
            cidade: "",
            estado: "",
            pais: "BR",
            codigoIbgeCidade: "",
            codigoIbgeEstado: "",
          },
    },
  };
}
