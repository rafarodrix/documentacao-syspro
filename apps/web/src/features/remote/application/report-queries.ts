import { prisma } from "@/lib/prisma";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { RemoteTenantScope } from "@/features/remote/domain/model";
import { buildScopedWhere } from "./queries";

export interface EfficiencyMetrics {
  averageTimeToRemoteSeconds: number | null;
  averageSessionDurationSeconds: number | null;
  totalSessionsCount: number;
  totalTicketsWithRemote: number;
  sessions: Array<{
    sessionId: string;
    ticketNumber: string | null;
    hostName: string;
    companyName: string;
    requestedByName: string;
    timeToRemoteSeconds: number | null;
    durationSeconds: number | null;
    createdAt: string;
  }>;
}

/**
 * Consulta de metricas de eficiencia para o dashboard de suporte remoto.
 * Foca no "Time to Remote" (tempo entre a abertura do ticket e o primeiro acesso).
 */
export async function getRemoteEfficiencyMetrics(tenantScope: RemoteTenantScope): Promise<EfficiencyMetrics> {
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);

  const sessions = await prisma.remoteSession.findMany({
    where: {
      ...scopedWhere,
      status: "ENDED",
      ticketNumber: { not: null },
    },
    include: {
      host: { select: { name: true } },
      company: { select: { nomeFantasia: true, razaoSocial: true } },
      requestedByUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100, // Limite para os ultimos atendimentos para performance
  });

  const processedSessions = await Promise.all(
    sessions.map(async (session) => {
      let timeToRemoteSeconds: number | null = null;
      let durationSeconds: number | null = null;

      // 1. Calcular Duracao da Sessao
      if (session.startedAt && session.endedAt) {
        durationSeconds = Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
      } else if (session.endedAt) {
        durationSeconds = Math.floor((session.endedAt.getTime() - session.createdAt.getTime()) / 1000);
      }

      // 2. Calcular Time to Remote (Sessao - Ticket)
      try {
        if (session.ticketNumber) {
            // Nota: Em producao, isso deveria ser otimizado com cache ou busca em lote
            const ticket = await ZammadGateway.getTicketById(session.ticketNumber).catch(() => null);
            if (ticket && ticket.created_at) {
                const ticketCreatedAt = new Date(ticket.created_at);
                timeToRemoteSeconds = Math.floor((session.createdAt.getTime() - ticketCreatedAt.getTime()) / 1000);
                
                // Sanitizacao: Se o ticket foi aberto DEPOIS da sessao (retroativo), ignorar
                if (timeToRemoteSeconds < 0) timeToRemoteSeconds = null;
            }
        }
      } catch (err) {
        console.error(`Erro ao buscar ticket ${session.ticketNumber} para métricas:`, err);
      }

      return {
        sessionId: session.id,
        ticketNumber: session.ticketNumber,
        hostName: session.host.name,
        companyName: session.company.nomeFantasia ?? session.company.razaoSocial,
        requestedByName: session.requestedByUser.name || "Técnico Trilink",
        timeToRemoteSeconds,
        durationSeconds,
        createdAt: session.createdAt.toISOString(),
      };
    })
  );

  const sessionsWithTimeToRemote = processedSessions.filter((s) => s.timeToRemoteSeconds !== null);
  const avgTTR = sessionsWithTimeToRemote.length
    ? Math.floor(sessionsWithTimeToRemote.reduce((acc, s) => acc + s.timeToRemoteSeconds!, 0) / sessionsWithTimeToRemote.length)
    : null;

  const sessionsWithDuration = processedSessions.filter((s) => s.durationSeconds !== null);
  const avgDuration = sessionsWithDuration.length
    ? Math.floor(sessionsWithDuration.reduce((acc, s) => acc + s.durationSeconds!, 0) / sessionsWithDuration.length)
    : null;

  const totalTickets = new Set(processedSessions.map((s) => s.ticketNumber).filter(Boolean)).size;

  return {
    averageTimeToRemoteSeconds: avgTTR,
    averageSessionDurationSeconds: avgDuration,
    totalSessionsCount: processedSessions.length,
    totalTicketsWithRemote: totalTickets,
    sessions: processedSessions,
  };
}
