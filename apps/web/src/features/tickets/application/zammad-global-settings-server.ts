import { prisma } from "@/lib/prisma";
import {
  ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY,
  getDefaultZammadGlobalSettings,
  ZAMMAD_GLOBAL_SETTINGS_KEY,
} from "@/features/tickets/application/zammad-global-settings-config";
import {
  zammadGlobalCatalogSchema,
  zammadGlobalSettingsSchema,
  type ZammadGlobalCatalog,
  type ZammadGlobalSettings,
} from "@dosc-syspro/contracts";

export async function getZammadGlobalSettingsSnapshot(): Promise<ZammadGlobalSettings> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: ZAMMAD_GLOBAL_SETTINGS_KEY },
      select: { value: true },
    });

    if (!setting?.value) {
      return getDefaultZammadGlobalSettings();
    }

    const parsed = JSON.parse(setting.value);
    const validation = zammadGlobalSettingsSchema.safeParse(parsed);
    if (!validation.success) {
      return getDefaultZammadGlobalSettings();
    }

    return validation.data;
  } catch {
    return getDefaultZammadGlobalSettings();
  }
}

export async function getZammadGlobalCatalogSnapshot(): Promise<ZammadGlobalCatalog | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY },
      select: { value: true },
    });

    if (!setting?.value) return null;
    const parsed = JSON.parse(setting.value);
    const validation = zammadGlobalCatalogSchema.safeParse(parsed);
    if (!validation.success) return null;
    return validation.data;
  } catch {
    return null;
  }
}

export async function saveZammadGlobalCatalogSnapshot(catalog: ZammadGlobalCatalog): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY },
    update: { value: JSON.stringify(catalog) },
    create: {
      key: ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY,
      value: JSON.stringify(catalog),
      description: "Snapshot do catalogo Zammad (grupos, estados, prioridades, owners).",
    },
  });
}
