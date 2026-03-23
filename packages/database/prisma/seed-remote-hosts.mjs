import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
        status: "ACTIVE",
      },
      create: {
        id: `seed-${company.id}-prod`,
        companyId: company.id,
        name: `${baseName} - Producao`,
        environment: "Producao",
        provider: "RustDesk",
        status: "ACTIVE",
      },
    });

    await prisma.remoteHost.upsert({
      where: { id: `seed-${company.id}-homol` },
      update: {
        name: `${baseName} - Homologacao`,
        environment: "Homologacao",
        provider: "RustDesk",
        status: "MAINTENANCE",
      },
      create: {
        id: `seed-${company.id}-homol`,
        companyId: company.id,
        name: `${baseName} - Homologacao`,
        environment: "Homologacao",
        provider: "RustDesk",
        status: "MAINTENANCE",
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
