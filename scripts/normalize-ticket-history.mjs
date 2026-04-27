import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.slice("--limit=".length), 10) : undefined;

function formatTeamLabel(team) {
  if (team === "DESENVOLVIMENTO") return "Desenvolvimento";
  if (team === "SUPORTE") return "Suporte";
  return team || "Nao definida";
}

function formatStatusLabel(status) {
  if (status === "NEW") return "Novo";
  if (status === "UNASSIGNED") return "Sem dono";
  if (status === "TRIAGE") return "Triagem";
  if (status === "IN_PROGRESS") return "Em andamento";
  if (status === "WAITING_CUSTOMER") return "Pendente cliente";
  if (status === "WAITING_INTERNAL") return "Aguardando interno";
  if (status === "TESTING") return "Em testes";
  if (status === "RESOLVED") return "Resolvido";
  if (status === "ARCHIVED") return "Arquivado";
  return status || "Desconhecido";
}

function formatPriorityLabel(priority) {
  if (priority === "LOW") return "Baixa";
  if (priority === "HIGH") return "Alta";
  if (priority === "CRITICAL") return "Critica";
  if (priority === "NORMAL") return "Normal";
  return priority || "Nao definida";
}

function normalizeLegacySystemEvent(body) {
  if (typeof body !== "string" || !body.trim()) return null;

  const normalized = body.replace(/\r/g, "").trim();

  const assumedMatch = normalized.match(/^Ticket assumido por (.+?) e movido para EM ANDAMENTO\.$/i);
  if (assumedMatch) {
    const name = assumedMatch[1].trim();
    return [`${name} assumiu o ticket.`, `Responsavel atual: ${name}`, `Estagio: ${formatStatusLabel("NEW")} -> ${formatStatusLabel("IN_PROGRESS")}`].join("\n");
  }

  const triageMatch = normalized.match(/^Ticket triado por (.+?)\.(.*)$/i);
  if (triageMatch) {
    const name = triageMatch[1].trim();
    const rest = triageMatch[2] || "";
    const lines = [`${name} realizou a triagem do ticket.`];

    const priorityMatch = rest.match(/Nova prioridade:\s*([A-Z_]+)/i);
    if (priorityMatch) {
      lines.push(`Prioridade: ${formatPriorityLabel(priorityMatch[1].trim().toUpperCase())}`);
    }

    const categoryMatch = rest.match(/Categoria:\s*([^.]+)\./i);
    if (categoryMatch) {
      lines.push(`Categoria: ${categoryMatch[1].trim()}`);
    }

    const teamMatch = rest.match(/Direcionado para:\s*([A-Z_]+)/i);
    if (teamMatch) {
      lines.push(`Equipe: ${formatTeamLabel(teamMatch[1].trim().toUpperCase())}`);
    }

    return lines.join("\n");
  }

  const transferMatch = normalized.match(/^Transferido para a fila \*\*(.+?)\*\*\.(?:\n\nNota:\s*(.+))?$/is);
  if (transferMatch) {
    const team = transferMatch[1].trim().toUpperCase();
    const note = transferMatch[2]?.trim();
    const lines = [
      "Sistema alterou o ticket.",
      `Equipe: Nao definida -> ${formatTeamLabel(team)}`,
    ];
    if (note) lines.push(`Contexto: ${note}`);
    return lines.join("\n");
  }

  return null;
}

async function main() {
  const rows = await prisma.conversationMessage.findMany({
    where: {
      type: "SYSTEM_EVENT",
      OR: [
        { body: { contains: "Ticket assumido por" } },
        { body: { contains: "Ticket triado por" } },
        { body: { contains: "Transferido para a fila **" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    ...(Number.isFinite(LIMIT) ? { take: LIMIT } : {}),
    select: {
      id: true,
      conversationId: true,
      body: true,
      createdAt: true,
    },
  });

  const changes = rows
    .map((row) => {
      const nextBody = normalizeLegacySystemEvent(row.body);
      if (!nextBody || nextBody === row.body) return null;
      return {
        id: row.id,
        conversationId: row.conversationId,
        createdAt: row.createdAt,
        previousBody: row.body,
        nextBody,
      };
    })
    .filter(Boolean);

  console.log(`[ticket-history] analisados: ${rows.length}`);
  console.log(`[ticket-history] convertiveis: ${changes.length}`);

  if (changes.length === 0) return;

  const backupDir = path.resolve(process.cwd(), "scripts", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `ticket-history-normalization-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(changes, null, 2), "utf8");
  console.log(`[ticket-history] backup: ${backupPath}`);

  if (!APPLY) {
    console.log("[ticket-history] dry-run concluido. Use --apply para gravar no banco.");
    for (const sample of changes.slice(0, 5)) {
      console.log(`\n# ${sample.id}`);
      console.log(`ANTES: ${sample.previousBody}`);
      console.log(`DEPOIS:\n${sample.nextBody}`);
    }
    return;
  }

  for (const change of changes) {
    await prisma.conversationMessage.update({
      where: { id: change.id },
      data: { body: change.nextBody },
    });
  }

  console.log(`[ticket-history] atualizados: ${changes.length}`);
}

main()
  .catch((error) => {
    console.error("[ticket-history] erro:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
