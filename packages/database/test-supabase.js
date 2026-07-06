const { PrismaClient } = require('@prisma/client');

// Using the direct Supabase hostname
const url = "postgresql://postgres:Rodrix250891@db.koqbpomgasizhnvugjvu.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  }
});

async function main() {
  console.log("Connecting to Supabase (direct)...");
  const result = await prisma.$queryRaw`SELECT NOW()`;
  console.log("Success! Server time:", result);
  
  // 1. Check if the permission 'companies:view_cockpit' exists in the DB
  const permissions = await prisma.permission.findMany({
    where: { key: 'companies:view_cockpit' }
  });
  console.log("Cockpit permission in DB:", permissions);

  // 2. Check which profiles have this permission assigned
  const profilePermissions = await prisma.accessProfilePermission.findMany({
    where: { permission: { key: 'companies:view_cockpit' } },
    include: { profile: true }
  });
  console.log("Profiles with cockpit permission:", profilePermissions.map(p => ({
    profileId: p.profileId,
    profileKey: p.profile.key,
    profileName: p.profile.name
  })));
}

main().catch(err => {
  console.error("Error:", err);
}).finally(() => {
  prisma.$disconnect();
});
