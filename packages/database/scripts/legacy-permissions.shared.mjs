import { PrismaClient } from "@prisma/client";

export const LEGACY_PERMISSION_MAPPINGS = [
  {
    legacyKey: "tax_reform:view",
    replacementKey: "tools:view",
    replacementLabel: "Acessar ferramentas",
    replacementModuleKey: "tools",
    replacementDescription: "Permite acessar o menu de ferramentas.",
  },
  {
    legacyKey: "tax_reform:manage",
    replacementKey: "tools:all",
    replacementLabel: "Acessar todas as ferramentas",
    replacementModuleKey: "tools",
    replacementDescription: "Libera ferramentas tecnicas completas.",
  },
  {
    legacyKey: "system_team:view",
    replacementKey: "users:view_internal",
    replacementLabel: "Visualizar equipe interna",
    replacementModuleKey: "users",
    replacementDescription: "Permite visualizar administradores e desenvolvedores.",
  },
  {
    legacyKey: "system_team:manage",
    replacementKey: "users:manage_internal",
    replacementLabel: "Gerenciar equipe interna",
    replacementModuleKey: "users",
    replacementDescription: "Permite criar e editar perfis de sistema.",
  },
];

export function createPrismaClient() {
  return new PrismaClient();
}

export function logSection(title) {
  console.log(`\n=== ${title} ===`);
}

export async function ensureReplacementPermissions(tx) {
  const permissions = [];

  for (const mapping of LEGACY_PERMISSION_MAPPINGS) {
    const permission = await tx.permission.upsert({
      where: { key: mapping.replacementKey },
      update: {
        label: mapping.replacementLabel,
        moduleKey: mapping.replacementModuleKey,
        description: mapping.replacementDescription,
        isActive: true,
      },
      create: {
        key: mapping.replacementKey,
        label: mapping.replacementLabel,
        moduleKey: mapping.replacementModuleKey,
        description: mapping.replacementDescription,
        isActive: true,
      },
      select: {
        id: true,
        key: true,
      },
    });

    permissions.push(permission);
  }

  return new Map(permissions.map((permission) => [permission.key, permission.id]));
}
