import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/core/infrastructure/gateways/zammad-gateway";
import { isAnalysisOrDevelopmentStateId, isAnalysisOrDevelopmentStateName } from "@/core/infrastructure/mappers/zammad-ticket.mapper";

export const dynamic = "force-dynamic";

type NotificationLevel = "critical" | "warning" | "info";

type NotificationItem = {
  id: string;
  level: NotificationLevel;
  title: string;
  description: string;
  href: string;
  createdAt: string;
};

const SYSTEM_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];
const ACTIVE_STATES = [2, 3];

function isSystemRole(role: string): boolean {
  return SYSTEM_ROLES.includes(role);
}

function minutesBetween(now: Date, dateLike: string | Date): number {
  const date = new Date(dateLike);
  return Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
}

function buildTicketNotifications(
  tickets: Array<{ id: number; title: string; updated_at: string; priority_id?: number | null; state?: string | null; state_id?: number | null }>
): NotificationItem[] {
  const now = new Date();
  const items: NotificationItem[] = [];

  for (const ticket of tickets) {
    const isActiveState =
      isAnalysisOrDevelopmentStateId(ticket.state_id) ||
      isAnalysisOrDevelopmentStateName(ticket.state);

    if (!isActiveState) continue;

    const mins = minutesBetween(now, ticket.updated_at);
    const hours = Math.max(1, Math.floor(mins / 60));
    const href = `/app/chamados/${ticket.id}`;

    if (ticket.priority_id === 3 && mins >= 240) {
      items.push({
        id: `ticket-high-${ticket.id}`,
        level: "critical",
        title: "Chamado critico sem resposta",
        description: `#${ticket.id} ${ticket.title} sem atualizacao ha ${hours}h.`,
        href,
        createdAt: ticket.updated_at,
      });
      continue;
    }

    if (mins >= 1440) {
      items.push({
        id: `ticket-stale-${ticket.id}`,
        level: "warning",
        title: "Chamado parado ha mais de 24h",
        description: `#${ticket.id} ${ticket.title} sem atualizacao ha ${hours}h.`,
        href,
        createdAt: ticket.updated_at,
      });
      continue;
    }

    if (mins <= 30) {
      items.push({
        id: `ticket-recent-${ticket.id}`,
        level: "info",
        title: "Chamado atualizado recentemente",
        description: `#${ticket.id} ${ticket.title} atualizado nos ultimos ${Math.max(1, mins)} min.`,
        href,
        createdAt: ticket.updated_at,
      });
    }
  }

  return items;
}

async function buildSystemOperationalNotifications(includeContracts: boolean): Promise<NotificationItem[]> {
  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(now.getDate() + 30);

  const [contracts, sefazRecords] = await Promise.all([
    includeContracts
      ? prisma.contract.findMany({
          where: {
            status: "ACTIVE",
            endDate: { not: null, lte: in30Days },
          },
          include: { company: { select: { razaoSocial: true } } },
          orderBy: { endDate: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    prisma.sefazStatus.findMany({
      where: { uf: "MG" },
      orderBy: { createdAt: "desc" },
      distinct: ["service"],
      take: 2,
    }),
  ]);

  const items: NotificationItem[] = [];

  for (const contract of contracts) {
    if (!contract.endDate) continue;
    const isExpired = contract.endDate < now;
    const days = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    items.push({
      id: `contract-${contract.id}`,
      level: isExpired ? "critical" : "warning",
      title: isExpired ? "Contrato vencido" : "Contrato proximo do vencimento",
      description: isExpired
        ? `${contract.company.razaoSocial} com contrato vencido.`
        : `${contract.company.razaoSocial} vence em ${days} dia(s).`,
      href: "/app/contratos",
      createdAt: contract.updatedAt.toISOString(),
    });
  }

  for (const sefaz of sefazRecords) {
    if (sefaz.status === "ONLINE") continue;
    items.push({
      id: `sefaz-${sefaz.service}-${sefaz.id}`,
      level: sefaz.status === "OFFLINE" ? "critical" : "warning",
      title: `SEFAZ ${sefaz.service} ${sefaz.status === "OFFLINE" ? "indisponivel" : "instavel"}`,
      description: `UF ${sefaz.uf} com latencia ${sefaz.latency}ms.`,
      href: "/app",
      createdAt: sefaz.createdAt.toISOString(),
    });
  }

  return items;
}

function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  const levelWeight: Record<NotificationLevel, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return [...items].sort((a, b) => {
    const levelDiff = levelWeight[b.level] - levelWeight[a.level];
    if (levelDiff !== 0) return levelDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function getScopedCompanyUserEmails(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
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

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const systemUser = isSystemRole(session.role);

  const scopedEmails = systemUser ? [] : await getScopedCompanyUserEmails(session.userId);
  const tickets = systemUser
    ? await ZammadGateway.getAllTickets(30)
    : await ZammadGateway.getTicketsForCustomerEmails(scopedEmails, {
        stateIds: ACTIVE_STATES,
        limit: 30,
        perEmailLimit: 30,
      });

  const ticketNotifications = buildTicketNotifications(tickets);
  const operational = systemUser ? await buildSystemOperationalNotifications(session.role === "ADMIN") : [];
  const merged = sortNotifications([...ticketNotifications, ...operational]).slice(0, 12);

  return NextResponse.json({
    items: merged,
    unreadCount: merged.filter((item) => item.level !== "info").length,
    generatedAt: new Date().toISOString(),
  });
}
