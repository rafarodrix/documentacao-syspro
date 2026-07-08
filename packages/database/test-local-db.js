const { PrismaClient } = require('@prisma/client');

const passwords = ["Trilink098", "Rodrix250891", "postgres", "admin", "root", "", "123456"];

async function testPassword(password) {
  const url = password 
    ? `postgresql://postgres:${password}@localhost:5432/postgres`
    : `postgresql://postgres@localhost:5432/postgres`;
    
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });
  
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    console.log(`SUCCESS with password: "${password}"`);
    return true;
  } catch (err) {
    console.log(`FAILED with password: "${password}" - Error code: ${err.code}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Testing connection with common passwords...");
  for (const pw of passwords) {
    const success = await testPassword(pw);
    if (success) {
      console.log(`\nFOUND WORKING DB PASSWORD: "${pw}"`);
      return;
    }
  }
  console.log("\nNo common passwords worked.");
}

main().catch(console.error);
