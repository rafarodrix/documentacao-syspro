import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function buildInstallToken(companyId, environmentKey) {
  return `seed-token-${companyId}-${environmentKey}`;
}

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  if (!companies.length) {
    console.log("Nenhuma empresa encontrada para seed de RemoteHost.");
    return;
  }

  for (const company of companies) {
    const baseName = company.nomeFantasia ?? company.razaoSocial;

    await prisma.remoteHost.upsert({
      where: { id: `seed-${company.id}-prod` },
      update: {
        name: `${baseName} - Producao`,
        environment: "Producao",
        provider: "RustDesk",
        description: `Host principal de producao da empresa ${baseName}.`,
        agentExternalId: `rustdesk-${company.id}-prod`,
        installToken: buildInstallToken(company.id, "prod"),
        machineName: `${baseName.replace(/\s+/g, "-").toUpperCase()}-PROD`,
        agentVersion: "rustdesk-oss-seed-1.0.0",
        status: "ACTIVE",
        lastHeartbeatAt: new Date(),
      },
      create: {
        id: `seed-${company.id}-prod`,
        companyId: company.id,
        name: `${baseName} - Producao`,
        environment: "Producao",
        provider: "RustDesk",
        description: `Host principal de producao da empresa ${baseName}.`,
        agentExternalId: `rustdesk-${company.id}-prod`,
        installToken: buildInstallToken(company.id, "prod"),
        machineName: `${baseName.replace(/\s+/g, "-").toUpperCase()}-PROD`,
        agentVersion: "rustdesk-oss-seed-1.0.0",
        status: "ACTIVE",
        lastHeartbeatAt: new Date(),
      },
    });

    await prisma.remoteHost.upsert({
      where: { id: `seed-${company.id}-homol` },
      update: {
        name: `${baseName} - Homologacao`,
        environment: "Homologacao",
        provider: "RustDesk",
        description: `Host de homologacao da empresa ${baseName} para testes e validacoes.`,
        agentExternalId: `rustdesk-${company.id}-homol`,
        installToken: buildInstallToken(company.id, "homol"),
        machineName: `${baseName.replace(/\s+/g, "-").toUpperCase()}-HML`,
        agentVersion: "rustdesk-oss-seed-1.0.0",
        status: "MAINTENANCE",
        lastHeartbeatAt: null,
      },
      create: {
        id: `seed-${company.id}-homol`,
        companyId: company.id,
        name: `${baseName} - Homologacao`,
        environment: "Homologacao",
        provider: "RustDesk",
        description: `Host de homologacao da empresa ${baseName} para testes e validacoes.`,
        agentExternalId: `rustdesk-${company.id}-homol`,
        installToken: buildInstallToken(company.id, "homol"),
        machineName: `${baseName.replace(/\s+/g, "-").toUpperCase()}-HML`,
        agentVersion: "rustdesk-oss-seed-1.0.0",
        status: "MAINTENANCE",
        lastHeartbeatAt: null,
      },
    });
  }

  console.log(`Seed remoto concluido para ${companies.length} empresa(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
