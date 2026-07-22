import { PrismaClient } from "@prisma/client";
import path from "node:path";

const prisma = new PrismaClient();

function canonicalizePath(rawPath) {
  if (!rawPath) return "";
  let cleaned = rawPath.trim().replace(/\//g, "\\");
  cleaned = path.win32.normalize(cleaned);
  if (cleaned.length > 3 && cleaned.endsWith("\\")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned.toLowerCase();
}

function toLegacyInstallation(update) {
  const rawPath = update.path?.trim();
  if (!rawPath) return null;

  const normalizedPath = path.win32.normalize(rawPath.replace(/\//g, "\\"));
  const isExecutable = normalizedPath.toLowerCase().endsWith("\\sysproserver.exe");
  const serverPath = isExecutable ? path.win32.dirname(normalizedPath) : null;
  const rootPath = serverPath && path.win32.basename(serverPath).toLowerCase() === "server"
    ? path.win32.dirname(serverPath)
    : normalizedPath;

  return {
    rootPath,
    canonicalRootPath: canonicalizePath(rootPath),
    serverPath,
    executablePath: isExecutable ? normalizedPath : null,
  };
}

async function migrateLegacyInstallations() {
  console.log("Starting consolidation of legacy Syspro updates into ErpInstallation...");

  const updates = await prisma.remoteHostSysproUpdate.findMany();
  console.log(`Found ${updates.length} legacy update records to inspect.`);

  let createdCount = 0;
  let linkedCompanyCount = 0;

  for (const update of updates) {
    const legacyInstallation = toLegacyInstallation(update);
    if (!legacyInstallation?.canonicalRootPath) continue;

    const existingInstallations = await prisma.erpInstallation.findMany({
      where: { deviceId: update.hostId },
      select: { id: true, canonicalRootPath: true },
    });
    const matchingInstallation = existingInstallations.find(
      (installation) => canonicalizePath(installation.canonicalRootPath) === legacyInstallation.canonicalRootPath,
    ) ?? null;
    const installationData = {
      rootPath: legacyInstallation.rootPath,
      canonicalRootPath: legacyInstallation.canonicalRootPath,
      serverPath: legacyInstallation.serverPath,
      executablePath: legacyInstallation.executablePath,
      installationFingerprint: `${update.hostId}|${legacyInstallation.canonicalRootPath}`,
      discoverySources: ["LEGACY_SYSPRO_UPDATE"],
      lastSeenAt: update.lastHeartbeatAt,
    };
    const installation = matchingInstallation
      ? await prisma.erpInstallation.update({ where: { id: matchingInstallation.id }, data: installationData })
      : await prisma.erpInstallation.create({ data: {
        deviceId: update.hostId,
        ...installationData,
      }});

    createdCount++;

    if (update.companyLabel) {
      const companyCode = update.companyLabel.trim();
      const currentLink = await prisma.erpInstallationCompany.findUnique({
        where: { installationId_companyCode: { installationId: installation.id, companyCode } },
        select: { role: true },
      });
      const hasPrimary = await prisma.erpInstallationCompany.count({
        where: { installationId: installation.id, active: true, role: "PRIMARY" },
      });
      await prisma.erpInstallationCompany.upsert({
        where: {
          installationId_companyCode: {
            installationId: installation.id,
            companyCode,
          },
        },
        create: {
          installationId: installation.id,
          companyCode,
          companyName: companyCode,
          companyId: update.companyId ?? null,
          role: hasPrimary ? "SECONDARY" : "PRIMARY",
          active: true,
        },
        update: {
          companyId: update.companyId ?? null,
          role: currentLink?.role ?? (hasPrimary ? "SECONDARY" : "PRIMARY"),
          active: true,
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
