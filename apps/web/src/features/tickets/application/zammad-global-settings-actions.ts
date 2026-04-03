"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import {
  getZammadGlobalCatalogSnapshot,
  getZammadGlobalSettingsSnapshot,
  saveZammadGlobalCatalogSnapshot,
} from "@/features/tickets/application/zammad-global-settings-server";
import {
  ZAMMAD_GLOBAL_SETTINGS_KEY,
  zammadGlobalCatalogSchema,
  zammadGlobalSettingsSchema,
  type ZammadGlobalCatalog,
  type ZammadGlobalSettings,
} from "@/features/tickets/application/zammad-global-settings";
import type { SettingsActionResponse } from "@/features/settings/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

export type ZammadGlobalSettingsFormSnapshot = {
  settings: ZammadGlobalSettings;
  catalog: ZammadGlobalCatalog;
  catalogSource: "live" | "snapshot";
  warning: string | null;
};

function validateSettingsAgainstCatalog(input: ZammadGlobalSettings, catalog: ZammadGlobalCatalog): string | null {
  const groupSet = new Set(catalog.groups.map((item) => item.name));
  const stateSet = new Set(catalog.states.map((item) => item.id));
  const prioritySet = new Set(catalog.priorities.map((item) => item.id));
  const articleTypeSet = new Set(catalog.articleTypes);

  if (!groupSet.has(input.defaultGroup)) {
    return `Grupo padrao invalido: '${input.defaultGroup}' nao existe no Zammad.`;
  }

  if (!stateSet.has(input.defaultStateId)) {
    return `Estado padrao invalido: state_id '${input.defaultStateId}' nao existe no Zammad.`;
  }

  if (!prioritySet.has(input.defaultPriorityId)) {
    return `Prioridade padrao invalida: '${input.defaultPriorityId}' nao existe no Zammad.`;
  }

  if (!articleTypeSet.has(input.defaultArticleType)) {
    return `Tipo de artigo invalido: '${input.defaultArticleType}'.`;
  }

  const roleDefaults = Object.entries(input.roleDefaults) as Array<
    [keyof ZammadGlobalSettings["roleDefaults"], ZammadGlobalSettings["roleDefaults"][keyof ZammadGlobalSettings["roleDefaults"]]]
  >;

  for (const [role, defaults] of roleDefaults) {
    if (!groupSet.has(defaults.group)) {
      return `Grupo invalido para perfil '${role}': '${defaults.group}' nao existe no Zammad.`;
    }
    if (!stateSet.has(defaults.stateId)) {
      return `State_id invalido para perfil '${role}': '${defaults.stateId}' nao existe no Zammad.`;
    }
    if (!prioritySet.has(defaults.priorityId)) {
      return `Prioridade invalida para perfil '${role}': '${defaults.priorityId}' nao existe no Zammad.`;
    }
  }

  return null;
}

async function loadCatalogWithFallback(): Promise<{
  catalog: ZammadGlobalCatalog | null;
  source: "live" | "snapshot" | null;
  warning: string | null;
}> {
  try {
    const liveCatalogRaw = await ZammadGateway.getGlobalCatalog("app-configuracoes-zammad");
    const liveValidation = zammadGlobalCatalogSchema.safeParse(liveCatalogRaw);
    if (!liveValidation.success) {
      throw new Error("catalog_live_parse_failed");
    }

    await saveZammadGlobalCatalogSnapshot(liveValidation.data);
    return { catalog: liveValidation.data, source: "live", warning: null };
  } catch (error) {
    const snapshot = await getZammadGlobalCatalogSnapshot();
    if (snapshot) {
      return {
        catalog: snapshot,
        source: "snapshot",
        warning: "Catalogo carregado do ultimo snapshot salvo. Dados possivelmente desatualizados (Zammad indisponivel).",
      };
    }

    console.error("Erro ao carregar catalogo global do Zammad:", error);
    return {
      catalog: null,
      source: null,
      warning: "Nao foi possivel carregar o catalogo do Zammad e nao existe snapshot salvo.",
    };
  }
}

export async function getZammadGlobalSettingsAction(): Promise<SettingsActionResponse<ZammadGlobalSettingsFormSnapshot>> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  const settings = await getZammadGlobalSettingsSnapshot();
  const catalogResult = await loadCatalogWithFallback();
  if (!catalogResult.catalog || !catalogResult.source) {
    return { success: false, error: catalogResult.warning ?? "Nao foi possivel carregar catalogo do Zammad." };
  }

  return {
    success: true,
    data: {
      settings,
      catalog: catalogResult.catalog,
      catalogSource: catalogResult.source,
      warning: catalogResult.warning,
    },
  };
}

export async function updateZammadGlobalSettingsAction(
  input: ZammadGlobalSettings
): Promise<SettingsActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = zammadGlobalSettingsSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? "Dados invalidos." };
  }

  const catalogResult = await loadCatalogWithFallback();
  if (!catalogResult.catalog) {
    return { success: false, error: catalogResult.warning ?? "Catalogo do Zammad indisponivel para validacao." };
  }

  const catalogError = validateSettingsAgainstCatalog(validation.data, catalogResult.catalog);
  if (catalogError) {
    return { success: false, error: catalogError };
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: ZAMMAD_GLOBAL_SETTINGS_KEY },
      update: { value: JSON.stringify(validation.data) },
      create: {
        key: ZAMMAD_GLOBAL_SETTINGS_KEY,
        value: JSON.stringify(validation.data),
        description: "Configuracoes globais de abertura de chamados Zammad",
      },
    });

    revalidatePath("/portal/configuracoes");
    revalidatePath("/portal/chamados");
    return {
      success: true,
      message:
        catalogResult.source === "snapshot"
          ? "Configuracoes salvas com validacao via snapshot local do catalogo (Zammad indisponivel)."
          : "Configuracoes globais do Zammad salvas.",
    };
  } catch (error) {
    console.error("Erro ao salvar configuracoes globais do Zammad:", error);
    return { success: false, error: "Erro ao salvar configuracoes globais do Zammad." };
  }
}
