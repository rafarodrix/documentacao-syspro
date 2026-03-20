import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/rbac";
import { requireRole } from "@/lib/auth-helpers";
import { CADASTROS_ROUTE_RULES } from "@/core/config/route-access";
import { CreateCompanyPageForm } from "@/components/platform/cadastros/company/CreateCompanyPageForm";
import { CadastrosAccessDenied } from "@/components/platform/cadastros/shared/CadastrosAccessDenied";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CadastrosEmpresaEditarPage({ params }: PageProps) {
  const session = await requireRole(
    [...CADASTROS_ROUTE_RULES.empresa.allowed] as Role[],
    CADASTROS_ROUTE_RULES.empresa.redirectIfBlocked,
  );

  if (!hasPermission(session.role, "companies:edit")) return <CadastrosAccessDenied />;

  const { id } = await params;
  const companyScopeIds =
    session.role === Role.CLIENTE_ADMIN
      ? (
          await prisma.membership.findMany({
            where: { userId: session.userId },
            select: { companyId: true },
          })
        ).map((m) => m.companyId)
      : null;

  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(session.role === Role.CLIENTE_ADMIN ? { id: { in: companyScopeIds?.length ? companyScopeIds : ["__none__"] } } : {}),
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
      crt: true,
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

  if (!company) return notFound();

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    orderBy: { razaoSocial: "asc" },
    select: {
      id: true,
      razaoSocial: true,
      nomeFantasia: true,
    },
  });

  const address = company.addresses[0];

  return (
    <CreateCompanyPageForm
      mode="edit"
      companyId={company.id}
      canEditCnpj={session.role !== Role.CLIENTE_ADMIN}
      backHref="/app/cadastros/empresa"
      companies={companies}
      initialData={{
        cnpj: company.cnpj,
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia ?? "",
        segment: company.segment ?? undefined,
        logoUrl: company.logoUrl ?? "",
        status: company.status,
        parentCompanyId: company.parentCompanyId ?? "",
        accountingFirmId: company.accountingFirmId ?? "",
        regimeTributario: company.regimeTributario ?? undefined,
        crt: company.crt ?? "",
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
      }}
    />
  );
}

