import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { parseContractBlockReason } from "@/core/config/contract-blocking";
import { getCompaniesAction, getCompanyZammadEmailsAction } from "@/features/company/application/actions";
import type {
  CompanyAdminListViewData,
  CompanyEditViewData,
  CompanyListItem,
  CompanyOption,
  CompanyZammadEmailInput,
} from "@/features/company/domain/model";

async function getSessionCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

export async function getCompanyOptionsAction(): Promise<CompanyOption[]> {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
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

  const result = await getCompaniesAction();
  if (!result.success || !result.data) {
    return { error: result.message ?? "Erro ao buscar empresas." };
  }

  return {
    companies: result.data.map((company: CompanyListItem) => {
      const block = parseContractBlockReason((company as any).observacoes);
      return {
        ...company,
        isBlockedByContract: company.isBlockedByContract ?? Boolean(block),
        contractBlockReasonLabel: company.contractBlockReasonLabel ?? block?.label ?? null,
      };
    }),
    isGlobalView: session.role !== Role.CLIENTE_ADMIN,
  };
}

export async function getCompanyEditViewData(companyId: string): Promise<CompanyEditViewData> {
  const session = await getProtectedSession();
  if (!session) notFound();

  const companyScopeIds =
    session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;

  const company = await prisma.company.findFirst({
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
    },
  });

  if (!company) notFound();

  const [companies, zammadEmailsResult] = await Promise.all([
    getCompanyOptionsAction(),
    getCompanyZammadEmailsAction(company.id),
  ]);

  const address = company.addresses[0];
  const initialZammadEmails: CompanyZammadEmailInput[] =
    zammadEmailsResult.success && Array.isArray(zammadEmailsResult.data)
      ? zammadEmailsResult.data.map((item: any) => ({
          email: item.email,
          label: item.label ?? undefined,
          isActive: item.isActive,
        }))
      : [];

  return {
    companyId: company.id,
    companies,
    canEditCnpj: session.role !== Role.CLIENTE_ADMIN,
    initialZammadEmails,
    initialData: {
      cnpj: company.cnpj,
      razaoSocial: company.razaoSocial,
      nomeFantasia: company.nomeFantasia ?? "",
      segment: company.segment ?? undefined,
      logoUrl: company.logoUrl ?? "",
      status: company.status,
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

