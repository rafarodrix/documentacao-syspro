import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function canonicalizePath(rawPath) {
  if (!rawPath) return "";
  let cleaned = rawPath.trim().replace(/\//g, "\\");
  if (cleaned.length > 3 && cleaned.endsWith("\\")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned.toUpperCase();
}

async function migrateLegacyInstallations() {
  console.log("Starting consolidation of legacy Syspro updates into ErpInstallation...");

  const updates = await prisma.remoteHostSysproUpdate.findMany();
  console.log(`Found ${updates.length} legacy update records to inspect.`);

  let createdCount = 0;
  let linkedCompanyCount = 0;

  for (const update of updates) {
    const canonical = canonicalizePath(update.path);
    if (!canonical) continue;

    const installation = await prisma.erpInstallation.upsert({
      where: {
        deviceId_canonicalRootPath: {
          deviceId: update.hostId,
          canonicalRootPath: canonical,
        },
      },
      create: {
        deviceId: update.hostId,
        rootPath: update.path,
        canonicalRootPath: canonical,
        serverPath: update.isServerHost ? update.path : null,
        executablePath: update.isServerHost ? `${update.path}\\SysproServer.exe` : null,
        installationFingerprint: `${update.hostId}|${canonical}`,
        discoverySources: ["LEGACY_SYSPRO_UPDATE"],
        lastSeenAt: update.lastHeartbeatAt,
      },
      update: {
        lastSeenAt: update.lastHeartbeatAt,
      },
    });

    createdCount++;

    if (update.companyLabel) {
      await prisma.erpInstallationCompany.upsert({
        where: {
          installationId_companyCode: {
            installationId: installation.id,
            companyCode: update.companyLabel.trim(),
          },
        },
        create: {
          installationId: installation.id,
          companyCode: update.companyLabel.trim(),
          companyName: update.companyLabel.trim(),
          companyId: update.companyId ?? null,
          role: "PRIMARY",
          active: true,
        },
        update: {
          companyId: update.companyId ?? null,
        },
      });
      linkedCompanyCount++;
    }
  }

  console.log(`Consolidation completed successfully: ${createdCount} installations processed, ${linkedCompanyCount} company links established.`);
}

migrateLegacyInstallations()
  .catch((err) => {
    console.error("Error migrating legacy installations:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
