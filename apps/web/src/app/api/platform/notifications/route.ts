import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getTicketsAction } from "@/features/tickets/application/ticket-actions";
import { Role } from "@prisma/client";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";

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

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];

function isSystemRole(role: Role): boolean {
  return SYSTEM_ROLES.includes(role);
}

function minutesBetween(now: Date, dateLike: string | Date): number {
  const date = new Date(dateLike);
  return Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
}

function buildTicketNotifications(tickets: TicketListItem[]): NotificationItem[] {
  const now = new Date();
  const items: NotificationItem[] = [];

  for (const ticket of tickets) {
    const status = String(ticket.status || "").toUpperCase();
    if (status === "RESOLVED" || status === "ARCHIVED") continue;

    const mins = minutesBetween(now, ticket.updatedAt);
    const hours = Math.max(1, Math.floor(mins / 60));
    const href = `/portal/tickets/${ticket.id}`;
    const number = ticket.number || String(ticket.id);

    if (ticket.priority >= 3 && mins >= 240) {
      items.push({
        id: `ticket-high-${ticket.id}`,
        level: "critical",
        title: "Chamado critico sem resposta",
        description: `#${number} ${ticket.title} sem atualizacao ha ${hours}h.`,
        href,
        createdAt: ticket.updatedAt,
      });
      continue;
    }

    if (mins >= 1440) {
      items.push({
        id: `ticket-stale-${ticket.id}`,
        level: "warning",
        title: "Chamado parado ha mais de 24h",
        description: `#${number} ${ticket.title} sem atualizacao ha ${hours}h.`,
        href,
        createdAt: ticket.updatedAt,
      });
      continue;
    }

    if (mins <= 30) {
      items.push({
        id: `ticket-recent-${ticket.id}`,
        level: "info",
        title: "Chamado atualizado recentemente",
        description: `#${number} ${ticket.title} atualizado nos ultimos ${Math.max(1, mins)} min.`,
        href,
        createdAt: ticket.updatedAt,
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
      href: "/portal/contratos",
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
      href: "/portal",
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

export async function GET() {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const systemUser = isSystemRole(session.role);
  const ticketsResponse = await getTicketsAction({ page: 1, pageSize: 50, queue: "all", statusGroup: "all" });
  const ticketNotifications = ticketsResponse.success ? buildTicketNotifications(ticketsResponse.data) : [];
  const operational = systemUser ? await buildSystemOperationalNotifications(session.role === Role.ADMIN) : [];
  const merged = sortNotifications([...ticketNotifications, ...operational]).slice(0, 12);

  return NextResponse.json({
    items: merged,
    unreadCount: merged.filter((item) => item.level !== "info").length,
    generatedAt: new Date().toISOString(),
  });
}
