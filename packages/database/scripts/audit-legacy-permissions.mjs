import {
  createPrismaClient,
  LEGACY_PERMISSION_MAPPINGS,
  logSection,
} from "./legacy-permissions.shared.mjs";

const prisma = createPrismaClient();

async function main() {
  const legacyKeys = LEGACY_PERMISSION_MAPPINGS.map((mapping) => mapping.legacyKey);

  const [legacyPermissions, impactedProfiles] = await Promise.all([
    prisma.permission.findMany({
      where: { key: { in: legacyKeys } },
      orderBy: { key: "asc" },
      select: {
        id: true,
        key: true,
        label: true,
        moduleKey: true,
        isActive: true,
        _count: {
          select: {
            accessProfilePermissions: true,
          },
        },
      },
    }),
    prisma.accessProfile.findMany({
      where: {
        permissions: {
          some: {
            permission: {
              key: { in: legacyKeys },
            },
          },
        },
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        key: true,
        name: true,
        isSystem: true,
        isActive: true,
        _count: {
          select: {
            userAssignments: true,
          },
        },
        permissions: {
          where: {
            permission: {
              key: { in: legacyKeys },
            },
          },
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    }),
  ]);

  logSection("Permissoes legadas encontradas");
  if (legacyPermissions.length === 0) {
    console.log("Nenhuma permissao legada encontrada no catalogo do banco.");
  } else {
    console.table(
      legacyPermissions.map((permission) => ({
        key: permission.key,
        label: permission.label,
        module: permission.moduleKey,
        ativa: permission.isActive,
        perfisVinculados: permission._count.accessProfilePermissions,
      })),
    );
  }

  logSection("Perfis impactados");
  if (impactedProfiles.length === 0) {
    console.log("Nenhum perfil ativo ou historico usa permissoes legadas.");
  } else {
    console.table(
      impactedProfiles.map((profile) => ({
        key: profile.key,
        nome: profile.name,
        sistema: profile.isSystem,
        ativo: profile.isActive,
        atribuicoesAtivasOuHistoricas: profile._count.userAssignments,
        permissoesLegadas: profile.permissions.map((item) => item.permission.key).join(", "),
      })),
    );
  }

  logSection("Plano de substituicao");
  console.table(
    LEGACY_PERMISSION_MAPPINGS.map((mapping) => ({
      legado: mapping.legacyKey,
      substituto: mapping.replacementKey,
    })),
  );
}

main()
  .catch((error) => {
    console.error("Falha ao auditar permissoes legadas.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
