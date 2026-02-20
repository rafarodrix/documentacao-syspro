import { requireSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats"
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies"
import { TicketsSummary, TicketSummaryItem } from "@/components/platform/app/dashboard/TicketsSummary"
import { ActivityChart } from "@/components/platform/app/dashboard/ActivityChart"
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway"
import { Ticket } from "@/core/domain/entities/ticket.entity"
import { ZammadTicketAPI } from "@/core/application/schema/zammad-api.schema"

// ─── Normalização de tickets para tipo unificado ──────────────────────────────

/**
 * Converte Ticket (getUserTickets) → TicketSummaryItem
 * Ticket já tem status/priority mapeados pelo ZammadGateway
 */
function normalizeClientTicket(t: Ticket): TicketSummaryItem {
  return {
    id:         t.id,
    number:     t.number,
    subject:    t.subject,
    status:     t.status,
    priority:   t.priority,
    lastUpdate: t.lastUpdate,
  }
}

/**
 * Converte ZammadTicketAPI (searchTickets) → TicketSummaryItem
 * searchTickets retorna dados brutos da API — mapeamos manualmente
 */
function normalizeAdminTicket(t: ZammadTicketAPI): TicketSummaryItem {
  return {
    id:         String(t.id),
    number:     t.number,
    subject:    t.title,
    // state_id 1=Novo→Aberto, 2/3=Em Análise, 4/5=Pendente
    status:     t.state_id === 1 ? "Aberto"
              : t.state_id <= 3  ? "Em Análise"
              : "Pendente",
    priority:   t.priority_id === 3 ? "Alta" : t.priority_id === 1 ? "Baixa" : "Média",
    lastUpdate: t.updated_at,
  }
}

// ─── Busca de dados ───────────────────────────────────────────────────────────

async function getDashboardData(email: string, role: string) {
  const isSystemUser = ["ADMIN", "DEVELOPER", "SUPORTE"].includes(role)

  // Queries do banco em paralelo (sem tickets — tipo divergente)
  const [
    companiesCount,
    companiesThisMonth,
    companiesLastMonth,
    usersCount,
    activeUsersCount,
    recentCompanies,
    sefazRecords,
  ] = await Promise.all([

    prisma.company.count({
      where: { status: "ACTIVE", deletedAt: null },
    }),

    prisma.company.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),

    prisma.company.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt:  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    prisma.user.count({ where: { deletedAt: null } }),

    prisma.user.count({ where: { isActive: true, deletedAt: null } }),

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

    prisma.sefazStatus.findMany({
      where: { uf: "MG" },
      orderBy: { createdAt: "desc" },
      distinct: ["service"],
      take: 2,
    }),
  ])

  // ─── Tickets — buscados separadamente para tipo garantido ─────────────────

  const tickets: TicketSummaryItem[] = isSystemUser
    ? (await ZammadGateway.searchTickets("state:\"1. Novo\" OR state:\"2. Em Analise\"", 5))
        .slice(0, 5)
        .map(normalizeAdminTicket)
    : (await ZammadGateway.getUserTickets(email))
        .slice(0, 5)
        .map(normalizeClientTicket)

  // ─── Totalização de abertos ───────────────────────────────────────────────

  const totalOpen = isSystemUser
    ? await ZammadGateway.getTicketCount("state:\"1. Novo\" OR state:\"2. Em Analise\"")
    : tickets.filter((t) => t.status !== "Resolvido").length

  // ─── Normalizar demais dados ──────────────────────────────────────────────

  const companies = recentCompanies.map((c) => ({
    ...c,
    cidade: c.addresses[0]?.cidade ?? null,
    estado: c.addresses[0]?.estado ?? null,
  }))

  const sefazNfe = sefazRecords.find((s) => s.service === "NFE") ?? {
    uf: "MG", service: "NFE" as const, status: "OFFLINE" as const, latency: 0,
  }
  const sefazNfce = sefazRecords.find((s) => s.service === "NFCE") ?? {
    uf: "MG", service: "NFCE" as const, status: "OFFLINE" as const, latency: 0,
  }

  return {
    companiesCount,
    companiesGrowth: companiesThisMonth - companiesLastMonth,
    usersCount,
    activeUsersCount,
    companies,
    sefazNfe:  { uf: sefazNfe.uf,  service: sefazNfe.service,  status: sefazNfe.status,  latency: sefazNfe.latency },
    sefazNfce: { uf: sefazNfce.uf, service: sefazNfce.service, status: sefazNfce.status, latency: sefazNfce.latency },
    tickets,
    totalOpen,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // requireSession já redireciona para /login se não autenticado
  const session = await requireSession()

  const data = await getDashboardData(session.email, session.role)

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
          tickets={data.tickets}
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