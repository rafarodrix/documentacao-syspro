// src/app/(app)/app/page.tsx
// Server Component — busca TODOS os dados reais aqui, passa via props para os componentes

import { requireSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats"
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies"
import { TicketsSummary } from "@/components/platform/app/dashboard/TicketsSummary"
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart"
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway"

// ─── Busca de dados ───────────────────────────────────────────────────────────

async function getDashboardData(userId: string, email: string, role: string) {
  const isSystemUser = ["ADMIN", "DEVELOPER", "SUPORTE"].includes(role)

  // Busca paralela para não bloquear uma na outra
  const [
    companiesCount,
    companiesThisMonth,
    companiesLastMonth,
    usersCount,
    activeUsersCount,
    recentCompanies,
    sefazRecords,
    tickets,
  ] = await Promise.all([

    // Total de empresas ativas
    prisma.company.count({
      where: { status: "ACTIVE", deletedAt: null },
    }),

    // Novas empresas este mês (para calcular growth)
    prisma.company.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),

    // Novas empresas mês passado
    prisma.company.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt:  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // Total de usuários
    prisma.user.count({ where: { deletedAt: null } }),

    // Usuários ativos
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),

    // 5 empresas mais recentes com localização
    prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        status: true,
        createdAt: true,
        _count: { select: { memberships: true } },
        addresses: {
          take: 1,
          select: { cidade: true, estado: true },
        },
      },
    }),

    // Status SEFAZ mais recente para MG (NF-e e NFC-e)
    prisma.sefazStatus.findMany({
      where: { uf: "MG" },
      orderBy: { createdAt: "desc" },
      distinct: ["service"],
      take: 2,
    }),

    // Chamados: admin vê todos, cliente vê os seus
    isSystemUser
      ? ZammadGateway.searchTickets("state:\"1. Novo\" OR state:\"2. Em Analise\"", 5)
          .then((raw) => raw.slice(0, 5))
      : ZammadGateway.getUserTickets(email).then((t) => t.slice(0, 5)),
  ])

  // ─── Normalizar dados ─────────────────────────────────────────────────────

  const growth = companiesThisMonth - companiesLastMonth

  // Normaliza companies para incluir cidade/estado do primeiro endereço
  const companies = recentCompanies.map((c) => ({
    ...c,
    cidade: c.addresses[0]?.cidade ?? null,
    estado: c.addresses[0]?.estado ?? null,
  }))

  // Fallback de status SEFAZ se não houver registros ainda
  const sefazNfe = sefazRecords.find((s) => s.service === "NFE") ?? {
    uf: "MG", service: "NFE" as const, status: "OFFLINE" as const, latency: 0,
  }
  const sefazNfce = sefazRecords.find((s) => s.service === "NFCE") ?? {
    uf: "MG", service: "NFCE" as const, status: "OFFLINE" as const, latency: 0,
  }

  // Conta chamados abertos (para o summary)
  const totalOpen = isSystemUser
    ? await ZammadGateway.getTicketCount("state:\"1. Novo\" OR state:\"2. Em Analise\"")
    : tickets.filter((t) => t.status !== "Resolvido").length

  return {
    companiesCount,
    companiesGrowth: growth,
    usersCount,
    activeUsersCount,
    companies,
    sefazNfe: { uf: sefazNfe.uf, service: sefazNfe.service, status: sefazNfe.status, latency: sefazNfe.latency },
    sefazNfce: { uf: sefazNfce.uf, service: sefazNfce.service, status: sefazNfce.status, latency: sefazNfce.latency },
    tickets,
    totalOpen,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // requireSession já redireciona para /login se não autenticado
  const session = await requireSession()

  const data = await getDashboardData(session.userId, session.email, session.role)

  return (
    <div className="flex-1 space-y-5 p-6">

      {/* Título da página */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Bom dia, {session.name?.split(" ")[0] ?? "usuário"} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Aqui está o resumo do sistema.
        </p>
      </div>

      {/* KPIs */}
      <DashboardStats
        companiesCount={data.companiesCount}
        companiesGrowth={data.companiesGrowth}
        usersCount={data.usersCount}
        activeUsersCount={data.activeUsersCount}
        sefazNfe={data.sefazNfe}
        sefazNfce={data.sefazNfce}
      />

      {/* Segunda linha: Chamados (full width) */}
      <div className="grid gap-4 grid-cols-4">
        <TicketsSummary
          tickets={data.tickets as any}
          totalOpen={data.totalOpen}
        />
      </div>

      {/* Terceira linha: Gráfico + Empresas Recentes */}
      <div className="grid gap-4 grid-cols-7">
        <ActivityChart />
        <RecentCompanies companies={data.companies} />
      </div>

    </div>
  )
}