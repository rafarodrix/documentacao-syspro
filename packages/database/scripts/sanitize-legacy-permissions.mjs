import {
  createPrismaClient,
  ensureReplacementPermissions,
  LEGACY_PERMISSION_MAPPINGS,
  logSection,
} from "./legacy-permissions.shared.mjs";

const prisma = createPrismaClient();

async function main() {
  const summary = [];

  await prisma.$transaction(async (tx) => {
    const replacementPermissionIds = await ensureReplacementPermissions(tx);

    for (const mapping of LEGACY_PERMISSION_MAPPINGS) {
      const legacyPermission = await tx.permission.findUnique({
        where: { key: mapping.legacyKey },
        select: { id: true, key: true },
      });

      if (!legacyPermission) {
        summary.push({
          legado: mapping.legacyKey,
          substituto: mapping.replacementKey,
          perfisMigrados: 0,
          relacoesRemovidas: 0,
          permissaoRemovida: false,
          status: "nao encontrada",
        });
        continue;
      }

      const replacementPermissionId = replacementPermissionIds.get(mapping.replacementKey);
      if (!replacementPermissionId) {
        throw new Error(`Permissao substituta ausente: ${mapping.replacementKey}`);
      }

      const profileLinks = await tx.accessProfilePermission.findMany({
        where: { permissionId: legacyPermission.id },
        select: { profileId: true },
      });

      const profileIds = profileLinks.map((link) => link.profileId);

      if (profileIds.length > 0) {
        await tx.accessProfilePermission.createMany({
          data: profileIds.map((profileId) => ({
            profileId,
            permissionId: replacementPermissionId,
          })),
          skipDuplicates: true,
        });
      }

      const deletedLinks = await tx.accessProfilePermission.deleteMany({
        where: { permissionId: legacyPermission.id },
      });

      const deletedPermission = await tx.permission.delete({
        where: { id: legacyPermission.id },
        select: { id: true },
      });

      summary.push({
        legado: mapping.legacyKey,
        substituto: mapping.replacementKey,
        perfisMigrados: profileIds.length,
        relacoesRemovidas: deletedLinks.count,
        permissaoRemovida: Boolean(deletedPermission.id),
        status: "migrada",
      });
    }
  });

  logSection("Saneamento concluido");
  console.table(summary);
}

main()
  .catch((error) => {
    console.error("Falha ao sanear permissoes legadas.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
