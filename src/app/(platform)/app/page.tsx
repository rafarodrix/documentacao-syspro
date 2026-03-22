import { requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { DashboardStats } from "@/components/platform/app/dashboard/DashboardStats";
import { RecentCompanies } from "@/components/platform/app/dashboard/RecentCompanies";
import { ActivityChart, ActivityPoint } from "@/components/platform/app/dashboard/ActivityChart";
import { TicketsSummary, TicketSummaryItem } from "@/components/platform/app/dashboard/TicketsSummary";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { ZammadOperationalTicket } from "@/core/application/schema/zammad-api.schema";
import {
  isAnalysisOrDevelopmentStateId,
  isAnalysisOrDevelopmentStateName,
  mapTicketPriority,
  mapTicketStatusFromStateId,
  mapTicketStatusFromStateName,
} from "@/core/infrastructure/mappers/zammad-ticket.mapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MagicCard } from "@/components/magicui/magic-card";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { ShineBorder } from "@/components/magicui/shine-border";
import { ArrowUpRight, BookOpen, Headset, Sparkles, Users } from "lucide-react";
import { getZammadRouteHealth } from "@/core/infrastructure/observability/zammad-observability";
import { upsertOperationalTicketsToCache } from "@/core/infrastructure/cache/zammad-ticket-cache";
import { getTicketsAction } from "@/actions/tickets/ticket-actions";
import { getTicketStatusGroup } from "@/core/config/tickets-workflow";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

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

function mapDashboardStatus(rawStatus: string, statusLabel?: string): TicketSummaryItem["status"] {
  const group = getTicketStatusGroup(rawStatus || statusLabel || "");
  if (group === "open") return "Aberto";
  if (group === "closed") return "Resolvido";
  return "Em Análise";
}

async function getScopedCompanyZammadEmailsByUserId(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: { companyId: true },
  });

  const companyIds = memberships.map((membership) => membership.companyId);
  if (!companyIds.length) return [];

  const configured = await prisma.companyZammadEmail.findMany({
    where: {
      companyId: { in: companyIds },
      isActive: true,
    },
    select: { email: true },
  });

  return Array.from(new Set(configured.map((item) => item.email.trim().toLowerCase()).filter(Boolean)));
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

async function getUserDashboardUF(userId: string): Promise<string> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      company: { deletedAt: null },
    },
    select: {
      company: {
        select: {
          addresses: {
            take: 1,
            orderBy: { id: "asc" },
            select: { estado: true },
          },
        },
      },
    },
  });

  const state = membership?.company?.addresses?.[0]?.estado?.trim().toUpperCase();
  return state && state.length === 2 ? state : "MG";
}

async function getDashboardData(userId: string, email: string, role: Role): Promise<AdminDashboardData | ClientDashboardData> {
  const isSystemUser = SYSTEM_ROLES.includes(role);
  const dashboardUF = await getUserDashboardUF(userId);

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
        where: { uf: dashboardUF },
        orderBy: { createdAt: "desc" },
        distinct: ["service"],
        take: 2,
      }),
      prisma.company.findMany({ where: { deletedAt: null, createdAt: { gte: start } }, select: { createdAt: true } }),
      ZammadGateway.getAllTickets(50, {
        cacheTtlSeconds: 60,
        tags: ["tickets-dashboard"],
        routeKey: "app-dashboard",
      }),
    ]);
    const activeTickets = ticketsRaw.filter((ticket) => {
      const status = isAnalysisOrDevelopmentStateId(ticket.state_id)
        ? mapTicketStatusFromStateId(ticket.state_id as number)
        : mapTicketStatusFromStateName(ticket.state || "");
      return status !== "Resolvido";
    });

    await upsertOperationalTicketsToCache(activeTickets);

    const tickets = activeTickets.slice(0, 5).map(normalizeOperationalTicket);
    const totalOpen = activeTickets.length;

    const companies = recentCompanies.map((c) => ({
      ...c,
      cidade: c.addresses[0]?.cidade ?? null,
      estado: c.addresses[0]?.estado ?? null,
    }));

    const latestNfe = sefazRecords.find((s) => s.service === "NFE");
    const latestNfce = sefazRecords.find((s) => s.service === "NFCE");

    const sefazNfe: AdminDashboardData["sefazNfe"] = {
      uf: dashboardUF,
      service: "NFE",
      status: latestNfe?.status ?? "OFFLINE",
      latency: latestNfe?.latency ?? 0,
    };

    const sefazNfce: AdminDashboardData["sefazNfce"] = {
      uf: dashboardUF,
      service: "NFCE",
      status: latestNfce?.status ?? "OFFLINE",
      latency: latestNfce?.latency ?? 0,
    };

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
      where: { userId, company: { deletedAt: null } },
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
    getScopedCompanyZammadEmailsByUserId(userId),
  ]);

  const ticketsResponse = scopedEmails.length
    ? await getTicketsAction({ page: 1, pageSize: 20, queue: "all" })
    : null;
  const normalizedTickets = ticketsResponse?.success
    ? ticketsResponse.data.map((ticket) => ({
        id: String(ticket.id),
        number: ticket.number,
        subject: ticket.title,
        status: mapDashboardStatus(ticket.status, ticket.statusLabel),
        priority: mapTicketPriority(ticket.priority),
        lastUpdate: ticket.updatedAt,
      }))
    : [];
  const tickets = normalizedTickets.filter((ticket) => ticket.status !== "Resolvido").slice(0, 10);
  const kpis = ticketKpis(normalizedTickets);

  return {
    mode: "client",
    companyName: membership?.company?.nomeFantasia || membership?.company?.razaoSocial || "Sem empresa vinculada",
    companyUsers: membership?.company?._count?.memberships || 0,
    tickets,
    totalOpen: kpis.open + kpis.pending,
    kpis,
    activity: toSeries(normalizedTickets.map((t) => new Date(t.lastUpdate))),
  };
}

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(session.userId, session.email, session.role);
  const isSystemUser = data.mode === "admin";
  const zammadHealth = getZammadRouteHealth("app-dashboard");

  return (
    <div className="flex-1 space-y-4 sm:space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Bom dia, {session.name?.split(" ")[0] ?? "usuário"}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isSystemUser ? "Visão operacional do sistema em tempo real." : "Resumo da sua conta e chamados recentes."}
        </p>
      </div>

      {zammadHealth.stale && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTitle>Dados em modo contingência</AlertTitle>
          <AlertDescription>
            Integração Zammad instável. Exibindo último cache válido de {zammadHealth.staleMinutes} min atrás.
          </AlertDescription>
        </Alert>
      )}

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
              description="Empresas criadas nos últimos 7 dias"
              points={data.activity}
              badgeLabel="Atualizado agora"
            />
            <RecentCompanies companies={data.companies} />
          </div>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-primary/10 p-5 sm:p-6">
            <ShineBorder borderWidth={1} duration={14} shineColor={["#60a5fa66", "#22d3ee55", "#a78bfa55"]} />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Painel do cliente
                </div>
                <h2 className="text-xl font-semibold tracking-tight">Sua operação em um só lugar</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe chamados, histórico e movimentações recentes da sua conta.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/app/chamados">
                    <Headset className="h-4 w-4" />
                    Ver chamados
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link href="/docs">
                    <BookOpen className="h-4 w-4" />
                    Abrir documentação
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <MagicCard className="rounded-xl">
              <Card className="h-full border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Minha empresa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">{data.companyName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {data.companyName === "Sem empresa vinculada"
                      ? "Solicite vínculo de empresa ao administrador."
                      : `${data.companyUsers} usuário(s) vinculado(s)`}
                  </p>
                </CardContent>
              </Card>
            </MagicCard>

            <MagicCard className="rounded-xl">
              <Card className="h-full border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Chamados em aberto</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    <NumberTicker value={data.totalOpen} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{data.kpis.pending} em análise/pendentes</p>
                </CardContent>
              </Card>
            </MagicCard>

            <MagicCard className="rounded-xl">
              <Card className="h-full border-border/50 bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Resolvidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    <NumberTicker value={data.kpis.resolved} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Histórico dos tickets recentes</p>
                </CardContent>
              </Card>
            </MagicCard>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
            <ShineBorder borderWidth={1} duration={16} shineColor={["#38bdf855", "#60a5fa44"]} className="opacity-70" />
            <div className="relative z-10 grid gap-4 grid-cols-1 xl:grid-cols-4">
              <TicketsSummary tickets={data.tickets} totalOpen={data.totalOpen} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/50 p-1">
            <ShineBorder borderWidth={1} duration={18} shineColor={["#22d3ee40", "#a78bfa44"]} className="opacity-60" />
            <div className="relative z-10 grid gap-4 grid-cols-1 xl:grid-cols-4">
              <ActivityChart
                title="Atualizações de chamados"
                description="Movimento dos seus chamados nos últimos 7 dias"
                points={data.activity}
                badgeLabel="Meu histórico"
                emptyLabel="Nenhuma atualização recente"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
              <Link href="/app/chamados">
                Ver todos os chamados
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}





