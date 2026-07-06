const { PrismaClient } = require('@prisma/client');

const url = "postgresql://postgres:Rodrix250891@localhost:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  }
});

async function main() {
  console.log("Connecting to local DB with Rodrix250891...");
  const result = await prisma.$queryRaw`SELECT NOW()`;
  console.log("Success! Server time:", result);
}

main().catch(err => {
  console.error("Error:", err);
}).finally(() => {
  prisma.$disconnect();
});
