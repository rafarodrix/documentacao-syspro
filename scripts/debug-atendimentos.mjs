import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DIAGNÓSTICO DO BANCO DE DADOS ===");

  // 1. Contagem total de tickets/conversas
  const totalConversations = await prisma.ticket.count();
  console.log("Total geral na tabela 'conversation' (Ticket):", totalConversations);

  // 2. Contagem de conversas do Chatwoot (externalThreadId não nulo)
  const chatwootConversationsCount = await prisma.ticket.count({
    where: { externalThreadId: { not: null } }
  });
  console.log("Total com externalThreadId (Chatwoot):", chatwootConversationsCount);

  // 3. Contagem total de CSATs
  const csatCount = await prisma.chatwootCsatRating.count();
  console.log("Total geral de CSAT Ratings:", csatCount);

  // 4. Amostra de conversas do Chatwoot para ver status, datas e companyId
  const sampleChatwoot = await prisma.ticket.findMany({
    where: { externalThreadId: { not: null } },
    take: 5,
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      channel: true,
      companyId: true,
      externalThreadId: true,
      createdAt: true,
    }
  });
  console.log("\nAmostra de conversas do Chatwoot no banco:");
  console.log(JSON.stringify(sampleChatwoot, null, 2));

  // 5. Verificar se existem tickets do Chatwoot com datas no período (22/05/2026 a 28/05/2026)
  const periodStart = new Date("2026-05-22T00:00:00.000Z");
  const periodEnd = new Date("2026-05-28T23:59:59.999Z");
  const periodCount = await prisma.ticket.count({
    where: {
      externalThreadId: { not: null },
      createdAt: { gte: periodStart, lte: periodEnd }
    }
  });
  console.log(`\nConversas Chatwoot criadas entre ${periodStart.toISOString()} e ${periodEnd.toISOString()}:`, periodCount);

  // 6. Verificar CSATs no período
  const periodCsatCount = await prisma.chatwootCsatRating.count({
    where: {
      respondedAt: { gte: periodStart, lte: periodEnd }
    }
  });
  console.log(`Avaliações CSAT respondidas no mesmo período:`, periodCsatCount);

  // 7. Agrupar por status de todas as conversas do Chatwoot
  const statusGroups = await prisma.ticket.groupBy({
    by: ['status'],
    where: { externalThreadId: { not: null } },
    _count: { id: true }
  });
  console.log("\nConversas Chatwoot agrupadas por STATUS no banco:");
  console.log(statusGroups);
}

main()
  .catch(err => console.error("Erro no diagnóstico:", err))
  .finally(async () => {
    await prisma.$disconnect();
  });
