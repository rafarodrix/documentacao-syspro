"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getZammadGlobalSettingsSnapshot } from "@/features/tickets/application/zammad-global-settings-server";
import {
  ZAMMAD_GLOBAL_SETTINGS_KEY,
  zammadGlobalSettingsSchema,
  type ZammadGlobalSettings,
} from "@/features/tickets/application/zammad-global-settings";
import type { SettingsActionResponse } from "@/features/settings/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

export async function getZammadGlobalSettingsAction(): Promise<SettingsActionResponse<ZammadGlobalSettings>> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  const data = await getZammadGlobalSettingsSnapshot();
  return { success: true, data };
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
    return { success: true, message: "Configuracoes globais do Zammad salvas." };
  } catch (error) {
    console.error("Erro ao salvar configuracoes globais do Zammad:", error);
    return { success: false, error: "Erro ao salvar configuracoes globais do Zammad." };
  }
}

