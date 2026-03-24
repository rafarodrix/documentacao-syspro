import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { buildTicketKpis, toTicketSummaryItems } from "@/features/tickets/application/dashboard";
import { queryTicketsForViewer } from "@/features/tickets/application/queries";
import type { AdminDashboardViewData, ClientDashboardViewData, TicketsDataResponse } from "@/features/tickets/domain/model";
import { getLatestOperationalTicketCacheFreshness } from "@/features/tickets/infrastructure/cache/zammad-ticket-cache";
import { getZammadRouteHealth } from "@/features/tickets/infrastructure/observability/zammad-observability";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-invalidation";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const TRANSPARENT_CACHE_THRESHOLD_MINUTES = 15;
const DASHBOARD_ZAMMAD_TIMEOUT_MS = 4000;

function timeoutError(label: string, timeoutMs: number) {
  return new Error(`${label} excedeu ${timeoutMs}ms.`);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function mergeZammadWarnings(...warnings: Array<string | undefined>): string | undefined {
  const unique = Array.from(new Set(warnings.filter(Boolean)));
  return unique.length > 0 ? unique.join(" ") : undefined;
}

function getDashboardTimeoutWarning() {
  return "Integracao Zammad em contingencia no dashboard. Alguns cards foram carregados com dados reduzidos.";
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

function toSeries(events: Date[]) {
  const { days } = getLast7DaysRange();
  const map = new Map<string, number>();

  for (const day of days) {
    const key = day.toISOString().slice(0, 10);
    map.set(key, 0);
  }

  for (const event of events) {
    const key = new Date(event).toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
  }

  return days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      value: map.get(key) || 0,
    };
  });
}

const getDashboardMetricsCached = unstable_cache(
  async () => {
    const now = new Date();
    return Promise.all([
      prisma.company.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.company.count({
        where: { deletedAt: null, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
      prisma.company.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    ]);
  },
  ["dashboard-metrics-v1"],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.dashboardMetrics],
  }
);

const getRecentCompaniesCached = unstable_cache(
  async () =>
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
  ["dashboard-recent-companies-v1"],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.dashboardCompanies],
  }
);

const getCompanyActivityCached = unstable_cache(
  async () => {
    const { start } = getLast7DaysRange();
    return prisma.company.findMany({
      where: { deletedAt: null, createdAt: { gte: start } },
      select: { createdAt: true },
    });
  },
  ["dashboard-company-activity-v1"],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.dashboardActivity],
  }
);

const getSefazRecordsCached = unstable_cache(
  async (uf: string) =>
    prisma.sefazStatus.findMany({
      where: { uf },
      orderBy: { createdAt: "desc" },
      distinct: ["service"],
      take: 2,
    }),
  ["dashboard-sefaz-v1"],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.dashboardSefaz, CACHE_TAGS.settings],
  }
);

async function getDashboardZammadWarning(routeKey: string): Promise<string | undefined> {
  const routeHealth = getZammadRouteHealth(routeKey);
  if (!routeHealth.stale) return undefined;

  const freshness = await getLatestOperationalTicketCacheFreshness();
  if (freshness.hasCache && freshness.staleMinutes !== null && freshness.staleMinutes <= TRANSPARENT_CACHE_THRESHOLD_MINUTES) {
    return undefined;
  }

  if (freshness.hasCache && freshness.staleMinutes !== null) {
    return `Integracao Zammad instavel. Cache local com ${freshness.staleMinutes} min sem sincronizacao.`;
  }

  return "Integracao Zammad instavel e sem cache local recente.";
}

async function getScopedCompanyZammadEmailsByUserId(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
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

export async function getDashboardData(
  userId: string,
  email: string,
  role: Role
): Promise<AdminDashboardViewData | ClientDashboardViewData> {
  const isSystemUser = SYSTEM_ROLES.includes(role);
  const dashboardUF = await getUserDashboardUF(userId);
  const zammadWarning = await getDashboardZammadWarning("app-chamados");

  if (isSystemUser) {
    const [
      metrics,
      recentCompanies,
      sefazRecords,
      companyActivity,
    ] = await Promise.all([
      getDashboardMetricsCached(),
      getRecentCompaniesCached(),
      getSefazRecordsCached(dashboardUF),
      getCompanyActivityCached(),
    ]);
    const [companiesCount, companiesThisMonth, companiesLastMonth, usersCount, activeUsersCount] = metrics;

    let ticketsResponse: TicketsDataResponse | null = null;
    let dashboardTicketWarning: string | undefined;

    try {
      ticketsResponse = await withTimeout(
        queryTicketsForViewer(
          { userId, email, role },
          { page: 1, pageSize: 50, queue: "all", statusGroup: "all" }
        ),
        DASHBOARD_ZAMMAD_TIMEOUT_MS,
        "Consulta de tickets do dashboard"
      );
    } catch {
      dashboardTicketWarning = getDashboardTimeoutWarning();
    }

    const successfulTicketsResponse = ticketsResponse && ticketsResponse.success ? ticketsResponse : null;
    const normalizedTickets = successfulTicketsResponse ? toTicketSummaryItems(successfulTicketsResponse.data) : [];
    const tickets = normalizedTickets.filter((ticket) => ticket.status !== "Resolvido").slice(0, 5);
    const totalOpen = successfulTicketsResponse
      ? successfulTicketsResponse.statusCounts.open + successfulTicketsResponse.statusCounts.pending
      : normalizedTickets.filter((ticket) => ticket.status !== "Resolvido").length;

    const companies = recentCompanies.map((company) => ({
      ...company,
      cidade: company.addresses[0]?.cidade ?? null,
      estado: company.addresses[0]?.estado ?? null,
    }));

    const latestNfe = sefazRecords.find((item) => item.service === "NFE");
    const latestNfce = sefazRecords.find((item) => item.service === "NFCE");

    const sefazNfe: AdminDashboardViewData["sefazNfe"] = {
      uf: dashboardUF,
      service: "NFE",
      status: latestNfe?.status ?? "OFFLINE",
      latency: latestNfe?.latency ?? 0,
    };

    const sefazNfce: AdminDashboardViewData["sefazNfce"] = {
      uf: dashboardUF,
      service: "NFCE",
      status: latestNfce?.status ?? "OFFLINE",
      latency: latestNfce?.latency ?? 0,
    };

    return {
      mode: "admin",
      zammadWarning: mergeZammadWarnings(zammadWarning, dashboardTicketWarning),
      companiesCount,
      companiesGrowth: companiesThisMonth - companiesLastMonth,
      usersCount,
      activeUsersCount,
      companies,
      sefazNfe,
      sefazNfce,
      tickets,
      totalOpen,
      activity: toSeries(companyActivity.map((company) => company.createdAt)),
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

  let ticketsResponse: TicketsDataResponse | null = null;
  let dashboardTicketWarning: string | undefined;

  if (scopedEmails.length) {
    try {
      ticketsResponse = await withTimeout(
        queryTicketsForViewer({ userId, email, role }, { page: 1, pageSize: 20, queue: "all", statusGroup: "all" }),
        DASHBOARD_ZAMMAD_TIMEOUT_MS,
        "Consulta de tickets do dashboard"
      );
    } catch {
      dashboardTicketWarning = getDashboardTimeoutWarning();
    }
  }

  const normalizedTickets = ticketsResponse?.success ? toTicketSummaryItems(ticketsResponse.data) : [];
  const tickets = normalizedTickets.filter((ticket) => ticket.status !== "Resolvido").slice(0, 10);
  const kpis = ticketsResponse?.success
    ? {
        open: ticketsResponse.statusCounts.open,
        pending: ticketsResponse.statusCounts.pending,
        resolved: ticketsResponse.statusCounts.closed,
      }
    : buildTicketKpis(normalizedTickets);

  return {
    mode: "client",
    zammadWarning: mergeZammadWarnings(zammadWarning, dashboardTicketWarning),
    companyName: membership?.company?.nomeFantasia || membership?.company?.razaoSocial || "Sem empresa vinculada",
    companyUsers: membership?.company?._count?.memberships || 0,
    tickets,
    totalOpen: kpis.open + kpis.pending,
    kpis,
    activity: toSeries(normalizedTickets.map((ticket) => new Date(ticket.lastUpdate))),
  };
}
