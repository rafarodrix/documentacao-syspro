import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { ActivityChart, ActivityPoint } from "@/components/platform/app/dashboard/ActivityChart";
import { TicketsSummary, TicketSummaryItem } from "@/components/platform/app/dashboard/TicketsSummary";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { ZammadOperationalTicket, ZammadTicketAPI } from "@/core/application/schema/zammad-api.schema";
import {
  isAnalysisOrDevelopmentStateId,
  isAnalysisOrDevelopmentStateName,
  mapTicketPriority,
  mapTicketStatusFromStateId,
  mapTicketStatusFromStateName,
} from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const DASHBOARD_ACTIVE_STATE_IDS = [2, 3] as const;
const DASHBOARD_ACTIVE_STATES_QUERY = DASHBOARD_ACTIVE_STATE_IDS.map((id) => `state_id:${id}`).join(" OR ");

function normalizeAdminTicket(t: ZammadTicketAPI): TicketSummaryItem {
  return {
    id: String(t.id),
    number: t.number,
    subject: t.title,
    status: mapTicketStatusFromStateId(t.state_id),
    priority: mapTicketPriority(t.priority_id),
    lastUpdate: t.updated_at,
  };
}

function normalizeOperationalTicket(t: ZammadOperationalTicket): TicketSummaryItem {
  const mappedStatus = isAnalysisOrDevelopmentStateId(t.state_id)
    ? mapTicketStatusFromStateId(t.state_id as number)
    : mapTicketStatusFromStateName(t.state || "");

  return {
    id: String(t.id),
    number: t.number,
    subject: t.title,
    status: mappedStatus,
    priority: mapTicketPriority(t.priority_id ?? 2),
    lastUpdate: t.updated_at,
  };
}

function getLast7DaysRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return { start, days };
}

function toSeries(events: Date[]): ActivityPoint[] {
  const { days } = getLast7DaysRange();
  const map = new Map<string, number>();

  for (const d of days) {
    const key = d.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  for (const event of events) {
    const key = new Date(event).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }

  return days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return {
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: map.get(key) || 0,
    };
  });
}

function ticketKpis(tickets: TicketSummaryItem[]) {
  return {
    open: tickets.filter((t) => t.status === "Aberto").length,
    pending: tickets.filter((t) => t.status === "Pendente" || t.status === "Em Análise").length,
    resolved: tickets.filter((t) => t.status === "Resolvido").length,
  };
}

async function getScopedCompanyUserEmailsByEmail(email: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      user: {
        email,
        deletedAt: null,
        isActive: true,
      },
    },
    select: { companyId: true },
  });

  const companyIds = memberships.map((membership) => membership.companyId);
  if (!companyIds.length) return [];

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      memberships: { some: { companyId: { in: companyIds } } },
    },
    select: { email: true },
  });

  return Array.from(new Set(users.map((user) => user.email.trim().toLowerCase()).filter(Boolean)));
}

type AdminDashboardData = {
  mode: "admin";
  companiesCount: number;
  companiesGrowth: number;
  usersCount: number;
  activeUsersCount: number;
  companies: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string;
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_DOCS";
    createdAt: Date;
    _count: { memberships: number };
    cidade: string | null;
    estado: string | null;
  }>;
  sefazNfe: { uf: string; service: "NFE"; status: "ONLINE" | "UNSTABLE" | "OFFLINE"; latency: number };
  sefazNfce: { uf: string; service: "NFCE"; status: "ONLINE" | "UNSTABLE" | "OFFLINE"; latency: number };
  tickets: TicketSummaryItem[];
  totalOpen: number;
  activity: ActivityPoint[];
};

type ClientDashboardData = {
  mode: "client";
  companyName: string;
  companyUsers: number;
  tickets: TicketSummaryItem[];
  totalOpen: number;
  kpis: { open: number; pending: number; resolved: number };
  activity: ActivityPoint[];
};

async function getDashboardData(email: string, role: Role): Promise<AdminDashboardData | ClientDashboardData> {
  const isSystemUser = SYSTEM_ROLES.includes(role);

  if (isSystemUser) {
    const { start } = getLast7DaysRange();

    const [
      companiesCount,
      companiesThisMonth,
      companiesLastMonth,
      usersCount,
      activeUsersCount,
      recentCompanies,
      sefazRecords,
      companyActivity,
      ticketsRaw,
      totalOpen,
    ] = await Promise.all([
      prisma.company.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.company.count({
        where: { deletedAt: null, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.company.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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
          addresses: { take: 1, select: { cidade: true, estado: true } },
        },
      }),
      prisma.sefazStatus.findMany({
        where: { uf: "MG" },
        orderBy: { createdAt: "desc" },
        distinct: ["service"],
        take: 2,
      }),
      prisma.company.findMany({ where: { deletedAt: null, createdAt: { gte: start } }, select: { createdAt: true } }),
      ZammadGateway.searchTickets(DASHBOARD_ACTIVE_STATES_QUERY, 10),
      ZammadGateway.getTicketCount(DASHBOARD_ACTIVE_STATES_QUERY),
    ]);

    const tickets = ticketsRaw.slice(0, 5).map(normalizeAdminTicket);

    const companies = recentCompanies.map((c) => ({
      ...c,
      cidade: c.addresses[0]?.cidade ?? null,
      estado: c.addresses[0]?.estado ?? null,
    }));

    const sefazNfe =
      (sefazRecords.find((s) => s.service === "NFE") as AdminDashboardData["sefazNfe"]) ||
      ({ uf: "MG", service: "NFE", status: "OFFLINE", latency: 0 } as const);

    const sefazNfce =
      (sefazRecords.find((s) => s.service === "NFCE") as AdminDashboardData["sefazNfce"]) ||
      ({ uf: "MG", service: "NFCE", status: "OFFLINE", latency: 0 } as const);

    return {
      mode: "admin",
      companiesCount,
      companiesGrowth: companiesThisMonth - companiesLastMonth,
      usersCount,
      activeUsersCount,
      companies,
      sefazNfe,
      sefazNfce,
      tickets,
      totalOpen,
      activity: toSeries(companyActivity.map((c) => c.createdAt)),
    };
  }

  const [membership, scopedEmails] = await Promise.all([
    prisma.membership.findFirst({
      where: { user: { email }, company: { deletedAt: null } },
      include: {
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
            _count: { select: { memberships: true } },
          },
        },
      },
    }),
    getScopedCompanyUserEmailsByEmail(email),
  ]);

  const userTickets = scopedEmails.length
    ? await ZammadGateway.getTicketsForCustomerEmails(scopedEmails, {
        stateIds: [...DASHBOARD_ACTIVE_STATE_IDS],
        limit: 10,
        perEmailLimit: 10,
      })
    : [];

  const tickets = userTickets
    .filter((ticket) => isAnalysisOrDevelopmentStateId(ticket.state_id) || isAnalysisOrDevelopmentStateName(ticket.state))
    .slice(0, 10)
    .map(normalizeOperationalTicket);
  const kpis = ticketKpis(tickets);

  return {
    mode: "client",
    companyName: membership?.company?.nomeFantasia || membership?.company?.razaoSocial || "Sem empresa vinculada",
    companyUsers: membership?.company?._count?.memberships || 0,
    tickets,
    totalOpen: tickets.filter((t) => t.status !== "Resolvido").length,
    kpis,
    activity: toSeries(tickets.map((t) => new Date(t.lastUpdate))),
  };
}

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.email, session.role);
  const isSystemUser = data.mode === "admin";

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Bom dia, {session.name?.split(" ")[0] ?? "usuario"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isSystemUser ? "Visao operacional do sistema em tempo real." : "Resumo da sua conta e chamados recentes."}
        </p>
      </div>

      {data.mode === "admin" ? (
        <>
          <DashboardStats
            companiesCount={data.companiesCount}
            companiesGrowth={data.companiesGrowth}
            usersCount={data.usersCount}
            activeUsersCount={data.activeUsersCount}
            sefazNfe={data.sefazNfe}
            sefazNfce={data.sefazNfce}
          />

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-4">
            <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-7">
            <ActivityChart
              title="Novos cadastros por dia"
              description="Empresas criadas nos ultimos 7 dias"
              points={data.activity}
              badgeLabel="Atualizado agora"
            />
            <RecentCompanies companies={data.companies} />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Minha empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{data.companyName}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.companyName === "Sem empresa vinculada"
                    ? "Solicite vínculo de empresa ao administrador."
                    : `${data.companyUsers} usuario(s) vinculado(s)`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chamados em aberto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.totalOpen}</p>
                <p className="text-xs text-muted-foreground mt-1">{data.kpis.pending} em analise/pendentes</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resolvidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{data.kpis.resolved}</p>
                <p className="text-xs text-muted-foreground mt-1">Historico dos tickets recentes</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-4">
            <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
          </div>

          <div className="grid gap-4 grid-cols-1 xl:grid-cols-4">
            <ActivityChart
              title="Atualizacoes de chamados"
              description="Movimento dos seus chamados nos ultimos 7 dias"
              points={data.activity}
              badgeLabel="Meu historico"
              emptyLabel="Nenhuma atualizacao recente"
            />
          </div>
        </>
      )}
    </div>
  );
}



