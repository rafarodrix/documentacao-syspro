import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:Trilink098@localhost:5432/postgres' }
  }
});

async function main() {
  console.log('Removendo permissoes antigas...');
  const result = await prisma.permission.deleteMany({
    where: {
      key: {
        in: ['system_team:view', 'system_team:manage'],
      },
    },
  });
  console.log('Permissoes removidas:', result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
